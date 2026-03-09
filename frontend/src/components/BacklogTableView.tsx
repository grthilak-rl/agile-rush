import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  BookOpen,
  ListChecks,
  Bug,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { backlogApi } from '../api/client';
import { useToast } from './ui/Toast';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ui/ConfirmDialog';
import type { BacklogItem, Sprint } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, { icon: typeof BookOpen; color: string; label: string }> = {
  story: { icon: BookOpen, color: '#3B82F6', label: 'Story' },
  task: { icon: ListChecks, color: '#8B5CF6', label: 'Task' },
  bug: { icon: Bug, color: '#F43F5E', label: 'Bug' },
};

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  critical: { color: '#EF4444', bg: '#FEF2F2' },
  high: { color: '#F97316', bg: '#FFF7ED' },
  medium: { color: '#EAB308', bg: '#FEFCE8' },
  low: { color: '#3B82F6', bg: '#EFF6FF' },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'story', label: 'Story' },
  { value: 'task', label: 'Task' },
  { value: 'bug', label: 'Bug' },
];

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr: string | null, status: string): boolean {
  if (!dateStr || status === 'done') return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < now;
}

// ---------------------------------------------------------------------------
// Inline editable cell
// ---------------------------------------------------------------------------

function EditableTextCell({
  value,
  itemId,
  field,
  projectId,
  onSaved,
}: {
  value: string;
  itemId: string;
  field: string;
  projectId: string;
  onSaved: (itemId: string, field: string, value: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    setEditing(false);
    if (text.trim() === value) return;
    try {
      await backlogApi.update(projectId, itemId, { [field]: text.trim() } as Partial<BacklogItem>);
      onSaved(itemId, field, text.trim());
    } catch {
      setText(value);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { setText(value); setEditing(false); }
        }}
        style={{
          width: '100%',
          padding: '4px 8px',
          fontSize: 13,
          border: '1px solid #2563EB',
          borderRadius: 4,
          outline: 'none',
          backgroundColor: '#FFFFFF',
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: 'text', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      {value}
    </span>
  );
}

function EditableSelectCell({
  value,
  options,
  itemId,
  field,
  projectId,
  onSaved,
  renderValue,
}: {
  value: string;
  options: { value: string; label: string }[];
  itemId: string;
  field: string;
  projectId: string;
  onSaved: (itemId: string, field: string, value: unknown) => void;
  renderValue: (val: string) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) {
      selectRef.current?.focus();
    }
  }, [editing]);

  const save = async (newVal: string) => {
    setEditing(false);
    if (newVal === value) return;
    try {
      await backlogApi.update(projectId, itemId, { [field]: newVal } as Partial<BacklogItem>);
      onSaved(itemId, field, newVal);
    } catch {
      // revert handled by parent
    }
  };

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => save(e.target.value)}
        onBlur={() => setEditing(false)}
        style={{
          width: '100%',
          padding: '4px 6px',
          fontSize: 12,
          border: '1px solid #2563EB',
          borderRadius: 4,
          outline: 'none',
          backgroundColor: '#FFFFFF',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
      {renderValue(value)}
    </div>
  );
}

function EditableNumberCell({
  value,
  itemId,
  field,
  projectId,
  onSaved,
}: {
  value: number | null;
  itemId: string;
  field: string;
  projectId: string;
  onSaved: (itemId: string, field: string, value: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value?.toString() || ''); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    setEditing(false);
    const num = text ? parseInt(text, 10) : null;
    if (num === value) return;
    try {
      await backlogApi.update(projectId, itemId, { [field]: num } as Partial<BacklogItem>);
      onSaved(itemId, field, num);
    } catch {
      setText(value?.toString() || '');
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') { setText(value?.toString() || ''); setEditing(false); }
        }}
        style={{
          width: 50,
          padding: '4px 6px',
          fontSize: 13,
          border: '1px solid #2563EB',
          borderRadius: 4,
          outline: 'none',
          backgroundColor: '#FFFFFF',
          textAlign: 'center',
        }}
        min={0}
      />
    );
  }

  return (
    <span onClick={() => setEditing(true)} style={{ cursor: 'pointer', display: 'block', textAlign: 'center' }}>
      {value ?? '-'}
    </span>
  );
}

function EditableDateCell({
  value,
  itemId,
  field,
  projectId,
  onSaved,
  status,
}: {
  value: string | null;
  itemId: string;
  field: string;
  projectId: string;
  onSaved: (itemId: string, field: string, value: unknown) => void;
  status: string;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async (newVal: string) => {
    setEditing(false);
    const v = newVal || null;
    if (v === value) return;
    try {
      await backlogApi.update(projectId, itemId, { [field]: v } as Partial<BacklogItem>);
      onSaved(itemId, field, v);
    } catch {
      // revert handled by parent
    }
  };

  const overdue = isOverdue(value, status);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        defaultValue={value || ''}
        onChange={(e) => save(e.target.value)}
        onBlur={() => setEditing(false)}
        style={{
          padding: '4px 6px',
          fontSize: 12,
          border: '1px solid #2563EB',
          borderRadius: 4,
          outline: 'none',
          backgroundColor: '#FFFFFF',
          width: '100%',
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{
        cursor: 'pointer',
        color: overdue ? '#EF4444' : '#334155',
        fontWeight: overdue ? 600 : 400,
      }}
    >
      {value ? formatShortDate(value) : '\u2014'}
    </span>
  );
}

function EditableAssigneeCell({
  assignee,
  members,
  itemId,
  projectId,
  onSaved,
}: {
  assignee: BacklogItem['assignee'];
  members: { id: string; full_name: string }[];
  itemId: string;
  projectId: string;
  onSaved: (itemId: string, field: string, value: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { if (editing) selectRef.current?.focus(); }, [editing]);

  const save = async (newVal: string) => {
    setEditing(false);
    const val = newVal || null;
    if (val === (assignee?.id || null)) return;
    try {
      await backlogApi.update(projectId, itemId, { assignee_id: val } as Partial<BacklogItem>);
      onSaved(itemId, 'assignee_id', val);
    } catch {
      // revert
    }
  };

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={assignee?.id || ''}
        onChange={(e) => save(e.target.value)}
        onBlur={() => setEditing(false)}
        style={{
          width: '100%',
          padding: '4px 6px',
          fontSize: 12,
          border: '1px solid #2563EB',
          borderRadius: 4,
          outline: 'none',
          backgroundColor: '#FFFFFF',
        }}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.full_name}</option>
        ))}
      </select>
    );
  }

  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
      {assignee ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Avatar name={assignee.full_name} size={22} />
          <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {assignee.full_name.split(' ')[0]}
          </span>
        </span>
      ) : (
        <span style={{ color: '#94A3B8', fontSize: 12 }}>{'\u2014'}</span>
      )}
    </div>
  );
}

function EditableSprintCell({
  sprintId,
  sprints,
  itemId,
  projectId,
  onSaved,
}: {
  sprintId: string | null;
  sprints: Sprint[];
  itemId: string;
  projectId: string;
  onSaved: (itemId: string, field: string, value: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { if (editing) selectRef.current?.focus(); }, [editing]);

  const save = async (newVal: string) => {
    setEditing(false);
    const val = newVal || null;
    if (val === sprintId) return;
    try {
      await backlogApi.update(projectId, itemId, { sprint_id: val } as Partial<BacklogItem>);
      onSaved(itemId, 'sprint_id', val);
    } catch {
      // revert
    }
  };

  const sprintName = sprintId ? sprints.find((s) => s.id === sprintId)?.name : null;

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={sprintId || ''}
        onChange={(e) => save(e.target.value)}
        onBlur={() => setEditing(false)}
        style={{
          width: '100%',
          padding: '4px 6px',
          fontSize: 12,
          border: '1px solid #2563EB',
          borderRadius: 4,
          outline: 'none',
          backgroundColor: '#FFFFFF',
        }}
      >
        <option value="">Unassigned</option>
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    );
  }

  return (
    <span onClick={() => setEditing(true)} style={{ cursor: 'pointer', fontSize: 12 }}>
      {sprintName || '\u2014'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface BacklogTableViewProps {
  items: BacklogItem[];
  sprints: Sprint[];
  members: { id: string; full_name: string }[];
  projectId: string;
  onItemClick: (item: BacklogItem) => void;
  onItemsChanged: () => void;
}

type SortField = 'title' | 'type' | 'priority' | 'status' | 'story_points' | 'due_date' | 'sprint_id';
type SortDir = 'asc' | 'desc' | null;

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER: Record<string, number> = { backlog: 0, todo: 1, in_progress: 2, in_review: 3, done: 4 };
const TYPE_ORDER: Record<string, number> = { story: 0, task: 1, bug: 2 };

export function BacklogTableView({
  items,
  sprints,
  members,
  projectId,
  onItemClick,
  onItemsChanged,
}: BacklogTableViewProps) {
  const { addToast } = useToast();

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Sort
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Bulk action state
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Clear selection when items change
  useEffect(() => { setSelected(new Set()); }, [items.length]);

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortField || !sortDir) return items;
    const sorted = [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'type':
          cmp = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
          break;
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
          break;
        case 'status':
          cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
          break;
        case 'story_points':
          cmp = (a.story_points ?? -1) - (b.story_points ?? -1);
          break;
        case 'due_date':
          if (!a.due_date && !b.due_date) cmp = 0;
          else if (!a.due_date) cmp = 1;
          else if (!b.due_date) cmp = -1;
          else cmp = a.due_date.localeCompare(b.due_date);
          break;
        case 'sprint_id': {
          const sa = a.sprint_id ? sprints.find((s) => s.id === a.sprint_id)?.name || '' : '';
          const sb = b.sprint_id ? sprints.find((s) => s.id === b.sprint_id)?.name || '' : '';
          cmp = sa.localeCompare(sb);
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [items, sortField, sortDir, sprints]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortField(null); setSortDir(null); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleAll = () => {
    if (selected.size === sortedItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sortedItems.map((i) => i.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Inline edit callback
  const handleCellSaved = useCallback((_itemId: string, _field: string, _value: unknown) => {
    onItemsChanged();
  }, [onItemsChanged]);

  // Bulk update
  const handleBulkAction = async (changes: Record<string, unknown>) => {
    if (selected.size === 0) return;
    try {
      await backlogApi.bulkUpdate(projectId, {
        item_ids: Array.from(selected),
        changes,
      });
      addToast('success', `${selected.size} item${selected.size > 1 ? 's' : ''} updated`);
      setSelected(new Set());
      onItemsChanged();
    } catch {
      addToast('error', 'Failed to update items');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    try {
      await backlogApi.bulkDelete(projectId, { item_ids: Array.from(selected) });
      addToast('success', `${selected.size} item${selected.size > 1 ? 's' : ''} deleted`);
      setSelected(new Set());
      onItemsChanged();
    } catch {
      addToast('error', 'Failed to delete items');
    } finally {
      setBulkDeleting(false);
      setBulkConfirmOpen(false);
    }
  };

  // Sort indicator
  const sortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp size={12} strokeWidth={2.5} style={{ marginLeft: 2, flexShrink: 0 }} />
      : <ChevronDown size={12} strokeWidth={2.5} style={{ marginLeft: 2, flexShrink: 0 }} />;
  };

  const headerCellStyle = (sortable: boolean): React.CSSProperties => ({
    padding: '10px 8px',
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #F1F5F9',
    backgroundColor: '#F8FAFC',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    cursor: sortable ? 'pointer' : 'default',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
  });

  const cellStyle: React.CSSProperties = {
    padding: '10px 8px',
    fontSize: 13,
    color: '#334155',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex',
    alignItems: 'center',
    minHeight: 44,
  };

  const bulkSelectStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 12,
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
  };

  if (sortedItems.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: '#64748B', fontSize: 14 }}>
        No items match your filters
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          overflow: 'auto',
        }}
      >
        {/* Table grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 100px 100px 110px 70px 120px 110px 90px',
            minWidth: 840,
          }}
        >
          {/* Header */}
          <div style={{ ...headerCellStyle(false), justifyContent: 'center' }}>
            <input
              type="checkbox"
              checked={selected.size > 0 && selected.size === sortedItems.length}
              onChange={toggleAll}
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div style={headerCellStyle(true)} onClick={() => toggleSort('title')}>Title {sortIcon('title')}</div>
          <div style={headerCellStyle(true)} onClick={() => toggleSort('type')}>Type {sortIcon('type')}</div>
          <div style={headerCellStyle(true)} onClick={() => toggleSort('priority')}>Priority {sortIcon('priority')}</div>
          <div style={headerCellStyle(true)} onClick={() => toggleSort('status')}>Status {sortIcon('status')}</div>
          <div style={{ ...headerCellStyle(true), justifyContent: 'center' }} onClick={() => toggleSort('story_points')}>Pts {sortIcon('story_points')}</div>
          <div style={headerCellStyle(false)}>Assignee</div>
          <div style={headerCellStyle(true)} onClick={() => toggleSort('due_date')}>Due Date {sortIcon('due_date')}</div>
          <div style={headerCellStyle(true)} onClick={() => toggleSort('sprint_id')}>Sprint {sortIcon('sprint_id')}</div>

          {/* Rows */}
          {sortedItems.map((item, idx) => {
            const isDone = item.status === 'done';
            const rowOverdue = isOverdue(item.due_date, item.status);
            const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC';

            return (
              <div
                key={item.id}
                style={{ display: 'contents' }}
                onMouseEnter={(e) => {
                  const cells = e.currentTarget.querySelectorAll<HTMLElement>('[data-row]');
                  cells.forEach((c) => { c.style.backgroundColor = '#F8FAFC'; });
                }}
                onMouseLeave={(e) => {
                  const cells = e.currentTarget.querySelectorAll<HTMLElement>('[data-row]');
                  cells.forEach((c) => { c.style.backgroundColor = rowBg; });
                }}
              >
                {/* Checkbox */}
                <div
                  data-row
                  style={{
                    ...cellStyle,
                    justifyContent: 'center',
                    backgroundColor: rowBg,
                    borderLeft: rowOverdue ? '4px solid #FCA5A5' : '4px solid transparent',
                    opacity: isDone ? 0.6 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleOne(item.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                {/* Title */}
                <div
                  data-row
                  style={{
                    ...cellStyle,
                    backgroundColor: rowBg,
                    opacity: isDone ? 0.6 : 1,
                    textDecoration: isDone ? 'line-through' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => onItemClick(item)}
                >
                  <EditableTextCell
                    value={item.title}
                    itemId={item.id}
                    field="title"
                    projectId={projectId}
                    onSaved={handleCellSaved}
                  />
                </div>

                {/* Type */}
                <div data-row style={{ ...cellStyle, backgroundColor: rowBg, opacity: isDone ? 0.6 : 1 }}>
                  <EditableSelectCell
                    value={item.type}
                    options={TYPE_OPTIONS}
                    itemId={item.id}
                    field="type"
                    projectId={projectId}
                    onSaved={handleCellSaved}
                    renderValue={(val) => {
                      const cfg = TYPE_CONFIG[val] || TYPE_CONFIG.task;
                      return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: cfg.color, fontWeight: 500 }}>
                          <cfg.icon size={13} strokeWidth={2.5} />
                          {cfg.label}
                        </span>
                      );
                    }}
                  />
                </div>

                {/* Priority */}
                <div data-row style={{ ...cellStyle, backgroundColor: rowBg, opacity: isDone ? 0.6 : 1 }}>
                  <EditableSelectCell
                    value={item.priority}
                    options={PRIORITY_OPTIONS}
                    itemId={item.id}
                    field="priority"
                    projectId={projectId}
                    onSaved={handleCellSaved}
                    renderValue={(val) => {
                      const pc = PRIORITY_COLORS[val] || { color: '#64748B', bg: '#F1F5F9' };
                      return (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: pc.bg,
                          color: pc.color,
                          textTransform: 'uppercase',
                        }}>
                          {val}
                        </span>
                      );
                    }}
                  />
                </div>

                {/* Status */}
                <div data-row style={{ ...cellStyle, backgroundColor: rowBg, opacity: isDone ? 0.6 : 1 }}>
                  <EditableSelectCell
                    value={item.status}
                    options={STATUS_OPTIONS}
                    itemId={item.id}
                    field="status"
                    projectId={projectId}
                    onSaved={handleCellSaved}
                    renderValue={(val) => {
                      const label = STATUS_OPTIONS.find((o) => o.value === val)?.label || val;
                      return <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>;
                    }}
                  />
                </div>

                {/* Story Points */}
                <div data-row style={{ ...cellStyle, justifyContent: 'center', backgroundColor: rowBg, opacity: isDone ? 0.6 : 1 }}>
                  <EditableNumberCell
                    value={item.story_points}
                    itemId={item.id}
                    field="story_points"
                    projectId={projectId}
                    onSaved={handleCellSaved}
                  />
                </div>

                {/* Assignee */}
                <div data-row style={{ ...cellStyle, backgroundColor: rowBg, opacity: isDone ? 0.6 : 1 }}>
                  <EditableAssigneeCell
                    assignee={item.assignee}
                    members={members}
                    itemId={item.id}
                    projectId={projectId}
                    onSaved={handleCellSaved}
                  />
                </div>

                {/* Due Date */}
                <div data-row style={{ ...cellStyle, backgroundColor: rowBg, opacity: isDone ? 0.6 : 1 }}>
                  <EditableDateCell
                    value={item.due_date}
                    itemId={item.id}
                    field="due_date"
                    projectId={projectId}
                    onSaved={handleCellSaved}
                    status={item.status}
                  />
                </div>

                {/* Sprint */}
                <div data-row style={{ ...cellStyle, backgroundColor: rowBg, opacity: isDone ? 0.6 : 1 }}>
                  <EditableSprintCell
                    sprintId={item.sprint_id}
                    sprints={sprints}
                    itemId={item.id}
                    projectId={projectId}
                    onSaved={handleCellSaved}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            border: '1px solid #E2E8F0',
            zIndex: 100,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
            {selected.size} item{selected.size > 1 ? 's' : ''} selected
          </span>

          <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />

          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleBulkAction({ priority: e.target.value });
              e.target.value = '';
            }}
            style={bulkSelectStyle}
          >
            <option value="" disabled>Priority</option>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleBulkAction({ assignee_id: e.target.value === '__none__' ? null : e.target.value });
              e.target.value = '';
            }}
            style={bulkSelectStyle}
          >
            <option value="" disabled>Assign</option>
            <option value="__none__">Unassigned</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>

          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleBulkAction({ sprint_id: e.target.value === '__none__' ? null : e.target.value });
              e.target.value = '';
            }}
            style={bulkSelectStyle}
          >
            <option value="" disabled>Sprint</option>
            <option value="__none__">Unassigned</option>
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleBulkAction({ status: e.target.value });
              e.target.value = '';
            }}
            style={bulkSelectStyle}
          >
            <option value="" disabled>Status</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button
            onClick={() => setBulkConfirmOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              backgroundColor: '#FEF2F2',
              color: '#EF4444',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} strokeWidth={2} />
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={bulkConfirmOpen}
        title={`Delete ${selected.size} item${selected.size > 1 ? 's' : ''}?`}
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
      />
    </>
  );
}
