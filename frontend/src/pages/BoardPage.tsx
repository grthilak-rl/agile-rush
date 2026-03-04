import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  X,
  Trash2,
  Check,
  Loader2,
  BookOpen,
  ListChecks,
  Bug,
} from 'lucide-react';
import {
  DndContext,
  closestCorners,
  DragOverlay,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { backlogApi, sprintsApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useOverlayContainer } from '../contexts/OverlayContainerContext';
import type { BacklogItem, Sprint, AcceptanceCriteria } from '../types';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { PointsBadge } from '../components/ui/PointsBadge';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SlidePanel } from '../components/ui/SlidePanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TYPE_CONFIG = {
  story: { icon: BookOpen, color: '#3B82F6', label: 'Story', emoji: '\u{1F4D6}' },
  task: { icon: ListChecks, color: '#8B5CF6', label: 'Task', emoji: '\u26A1' },
  bug: { icon: Bug, color: '#F43F5E', label: 'Bug', emoji: '\u{1F41B}' },
} as const;

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#3B82F6',
};

const POINTS_OPTIONS = [1, 2, 3, 5, 8, 13];

const STATUS_OPTIONS: { value: BacklogItem['status']; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: { value: BacklogItem['priority']; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  fontSize: 14,
  backgroundColor: '#FFFFFF',
  color: '#0F172A',
  transition: 'border-color 150ms ease',
};

function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3B82F6', '#8B5CF6', '#F97316', '#10B981', '#F43F5E',
    '#EAB308', '#06B6D4', '#EC4899', '#14B8A6', '#6366F1',
  ];
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const BOARD_COLUMNS = [
  { status: 'todo' as const, label: 'To Do', emoji: '\u{1F4CB}', color: '#6366F1' },
  { status: 'in_progress' as const, label: 'In Progress', emoji: '\u{1F528}', color: '#2563EB' },
  { status: 'in_review' as const, label: 'In Review', emoji: '\u{1F440}', color: '#F59E0B' },
  { status: 'done' as const, label: 'Done', emoji: '\u2705', color: '#10B981' },
] as const;

// ---------------------------------------------------------------------------
// SortableBoardCard
// ---------------------------------------------------------------------------

function SortableBoardCard({
  item,
  onOpen,
}: {
  item: BacklogItem;
  onOpen: (item: BacklogItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const cfg = TYPE_CONFIG[item.type];
  const TypeIcon = cfg.icon;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
      }}
    >
      <div
        onClick={() => onOpen(item)}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          borderLeft: `4px solid ${PRIORITY_COLORS[item.priority] || '#94A3B8'}`,
          padding: 12,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transition: 'box-shadow 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        }}
      >
        {/* Top row: type icon + labels */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              minWidth: 22,
              borderRadius: 4,
              backgroundColor: `${cfg.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TypeIcon size={12} color={cfg.color} strokeWidth={2.5} />
          </div>
          {item.labels.length > 0 && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', overflow: 'hidden' }}>
              {item.labels.slice(0, 2).map((label) => (
                <Badge
                  key={label}
                  label={label}
                  color={hashStringToColor(label)}
                  style={{ fontSize: 9, padding: '0px 5px' }}
                />
              ))}
              {item.labels.length > 2 && (
                <span style={{ fontSize: 10, color: '#94A3B8' }}>+{item.labels.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* Title (2-line clamp) */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#0F172A',
            lineHeight: '18px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 10,
          }}
        >
          {item.title}
        </div>

        {/* Bottom row: assignee + points */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {item.assignee ? (
            <Avatar name={item.assignee.full_name} size={24} />
          ) : (
            <div
              style={{
                width: 24,
                height: 24,
                minWidth: 24,
                borderRadius: '50%',
                border: '1.5px dashed #CBD5E1',
                backgroundColor: '#F8FAFC',
              }}
              title="Unassigned"
            />
          )}
          <PointsBadge points={item.story_points} size={24} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StaticBoardCard (for DragOverlay — no hooks)
// ---------------------------------------------------------------------------

function StaticBoardCard({ item }: { item: BacklogItem }) {
  const cfg = TYPE_CONFIG[item.type];
  const TypeIcon = cfg.icon;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderLeft: `4px solid ${PRIORITY_COLORS[item.priority] || '#94A3B8'}`,
        padding: 12,
        boxShadow: '0 12px 24px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)',
        width: 250,
        cursor: 'grabbing',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div
          style={{
            width: 22, height: 22, minWidth: 22, borderRadius: 4,
            backgroundColor: `${cfg.color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <TypeIcon size={12} color={cfg.color} strokeWidth={2.5} />
        </div>
        {item.labels.length > 0 && (
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {item.labels.slice(0, 2).map((label) => (
              <Badge key={label} label={label} color={hashStringToColor(label)} style={{ fontSize: 9, padding: '0px 5px' }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', marginBottom: 10 }}>
        {item.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {item.assignee ? (
          <Avatar name={item.assignee.full_name} size={24} />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px dashed #CBD5E1', backgroundColor: '#F8FAFC' }} />
        )}
        <PointsBadge points={item.story_points} size={24} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DroppableColumn
// ---------------------------------------------------------------------------

interface ColumnDef {
  status: string;
  label: string;
  emoji: string;
  color: string;
}

function DroppableColumn({
  column,
  items,
  onOpenItem,
  onQuickAdd,
  quickAddStatus,
  quickAddValue,
  onQuickAddChange,
  onQuickAddSubmit,
  onQuickAddCancel,
}: {
  column: ColumnDef;
  items: BacklogItem[];
  onOpenItem: (item: BacklogItem) => void;
  onQuickAdd: (status: string) => void;
  quickAddStatus: string | null;
  quickAddValue: string;
  onQuickAddChange: (value: string) => void;
  onQuickAddSubmit: () => void;
  onQuickAddCancel: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <div
      style={{
        flex: 1,
        minWidth: 260,
        maxWidth: 360,
        backgroundColor: isOver ? `${column.color}08` : '#F8FAFC',
        borderRadius: 12,
        border: isOver ? `2px dashed ${column.color}` : '2px dashed transparent',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 280px)',
        transition: 'all 150ms ease',
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: '12px 12px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{column.emoji}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{column.label}</span>
          <span
            style={{
              padding: '1px 8px',
              borderRadius: 999,
              backgroundColor: `${column.color}20`,
              color: column.color,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {items.length}
          </span>
        </div>
        <button
          onClick={() => onQuickAdd(column.status)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${column.color}15`;
            e.currentTarget.style.color = column.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#94A3B8';
          }}
          title={`Add item to ${column.label}`}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Quick-add input */}
      {quickAddStatus === column.status && (
        <div style={{ padding: '0 12px 8px' }}>
          <input
            autoFocus
            value={quickAddValue}
            onChange={(e) => onQuickAddChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && quickAddValue.trim()) onQuickAddSubmit();
              if (e.key === 'Escape') onQuickAddCancel();
            }}
            onBlur={() => {
              setTimeout(onQuickAddCancel, 150);
            }}
            placeholder="Item title + Enter"
            style={{
              ...fieldStyle,
              fontSize: 13,
              padding: '8px 10px',
            }}
          />
        </div>
      )}

      {/* Scrollable card list */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '4px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minHeight: 60,
        }}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableBoardCard key={item.id} item={item} onOpen={onOpenItem} />
          ))}
        </SortableContext>
        {items.length === 0 && !isOver && (
          <div
            style={{
              padding: '20px 12px',
              textAlign: 'center',
              color: '#CBD5E1',
              fontSize: 13,
              borderRadius: 8,
              border: '1px dashed #E2E8F0',
            }}
          >
            No items
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// BoardPage
// ===========================================================================

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const overlayContainer = useOverlayContainer();

  // -------------------------------------------------------------------------
  // Data state
  // -------------------------------------------------------------------------
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------------
  // DnD state
  // -------------------------------------------------------------------------
  const [activeId, setActiveId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Quick-add state
  // -------------------------------------------------------------------------
  const [quickAddStatus, setQuickAddStatus] = useState<string | null>(null);
  const [quickAddValue, setQuickAddValue] = useState('');

  // -------------------------------------------------------------------------
  // Detail panel state
  // -------------------------------------------------------------------------
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<BacklogItem['type']>('story');
  const [formPriority, setFormPriority] = useState<BacklogItem['priority']>('medium');
  const [formStatus, setFormStatus] = useState<BacklogItem['status']>('todo');
  const [formPoints, setFormPoints] = useState<number | null>(null);
  const [formCustomPoints, setFormCustomPoints] = useState('');
  const [formSprintId, setFormSprintId] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [formLabels, setFormLabels] = useState<string[]>([]);
  const [formLabelInput, setFormLabelInput] = useState('');
  const [formCriteria, setFormCriteria] = useState<AcceptanceCriteria[]>([]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  // -------------------------------------------------------------------------
  // Complete sprint modal state
  // -------------------------------------------------------------------------
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeAction, setCompleteAction] = useState<'move_to_backlog' | 'move_to_next_sprint'>('move_to_backlog');
  const [completing, setCompleting] = useState(false);

  // -------------------------------------------------------------------------
  // Delete confirm state
  // -------------------------------------------------------------------------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [activeRes, sprintsRes] = await Promise.all([
        sprintsApi.active(projectId),
        sprintsApi.list(projectId),
      ]);
      setActiveSprint(activeRes.data);
      setSprints(sprintsRes.data);
      if (activeRes.data) {
        const itemsRes = await backlogApi.list(projectId, { sprint_id: activeRes.data.id });
        setItems(itemsRes.data);
      } else {
        setItems([]);
      }
    } catch {
      addToast('error', 'Failed to load board data');
    } finally {
      setLoading(false);
    }
  }, [projectId, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const columnItems: Record<string, BacklogItem[]> = {
    todo: items.filter((i) => i.status === 'todo'),
    in_progress: items.filter((i) => i.status === 'in_progress'),
    in_review: items.filter((i) => i.status === 'in_review'),
    done: items.filter((i) => i.status === 'done'),
  };

  const totalPoints = items.reduce((sum, i) => sum + (i.story_points || 0), 0);
  const completedPoints = columnItems.done.reduce((sum, i) => sum + (i.story_points || 0), 0);
  const progressPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  const daysRemaining = activeSprint?.end_date
    ? Math.max(0, Math.ceil((new Date(activeSprint.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // -------------------------------------------------------------------------
  // Drag & drop
  // -------------------------------------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeItem = activeId ? items.find((i) => i.id === activeId) ?? null : null;

  function findColumnForItem(itemId: string): string {
    const item = items.find((i) => i.id === itemId);
    return item?.status || 'todo';
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeStatus = findColumnForItem(active.id as string);

    let overStatus: string;
    if (BOARD_COLUMNS.some((c) => c.status === over.id)) {
      overStatus = over.id as string;
    } else {
      overStatus = findColumnForItem(over.id as string);
    }

    if (activeStatus !== overStatus) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === active.id
            ? { ...item, status: overStatus as BacklogItem['status'] }
            : item
        )
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    setActiveId(null);
    if (!projectId) return;

    const movedItem = items.find((i) => i.id === active.id);
    if (!movedItem) return;

    backlogApi.update(projectId, movedItem.id, { status: movedItem.status }).catch(() => {
      addToast('error', 'Failed to update status');
      loadData();
    });
  }

  // -------------------------------------------------------------------------
  // Quick add
  // -------------------------------------------------------------------------
  const handleQuickAdd = useCallback(async () => {
    if (!projectId || !activeSprint || !quickAddValue.trim() || !quickAddStatus) return;
    try {
      const res = await backlogApi.create(projectId, {
        title: quickAddValue.trim(),
        status: quickAddStatus as BacklogItem['status'],
        sprint_id: activeSprint.id,
      });
      setItems((prev) => [...prev, res.data]);
      setQuickAddValue('');
      setQuickAddStatus(null);
      addToast('success', `"${res.data.title}" added`);
    } catch {
      addToast('error', 'Failed to create item');
    }
  }, [projectId, activeSprint, quickAddValue, quickAddStatus, addToast]);

  // -------------------------------------------------------------------------
  // Panel helpers
  // -------------------------------------------------------------------------
  const populateForm = useCallback((item: BacklogItem) => {
    setFormTitle(item.title);
    setFormType(item.type);
    setFormPriority(item.priority);
    setFormStatus(item.status);
    setFormPoints(item.story_points);
    setFormCustomPoints(item.story_points !== null ? String(item.story_points) : '');
    setFormSprintId(item.sprint_id);
    setFormDescription(item.description || '');
    setFormLabels([...item.labels]);
    setFormLabelInput('');
    setFormCriteria(
      item.acceptance_criteria
        ? item.acceptance_criteria.map((c) => ({ ...c }))
        : []
    );
    setSaveStatus('idle');

    lastSavedRef.current = JSON.stringify({
      formTitle: item.title, formType: item.type, formPriority: item.priority,
      formStatus: item.status, formPoints: item.story_points, formSprintId: item.sprint_id,
      formDescription: item.description || '', formLabels: [...item.labels],
      formCriteria: item.acceptance_criteria ? item.acceptance_criteria.map((c) => ({ ...c })) : [],
    });
  }, []);

  const openEditPanel = useCallback(
    (item: BacklogItem) => {
      populateForm(item);
      setEditingItem(item);
      setPanelOpen(true);
    },
    [populateForm]
  );

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setEditingItem(null);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    setSaveStatus('idle');
  }, []);

  // -------------------------------------------------------------------------
  // Auto-save
  // -------------------------------------------------------------------------
  const triggerAutoSave = useCallback(() => {
    if (!editingItem || !projectId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    setSaveStatus('saving');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload: Partial<BacklogItem> = {
          title: formTitle,
          type: formType,
          priority: formPriority,
          status: formStatus,
          story_points: formPoints,
          sprint_id: formSprintId,
          description: formDescription || null,
          labels: formLabels,
          acceptance_criteria: formCriteria,
        };
        const res = await backlogApi.update(projectId, editingItem.id, payload);
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? res.data : i))
        );
        setEditingItem(res.data);
        setSaveStatus('saved');
        savedFadeRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 500);
  }, [
    editingItem, projectId,
    formTitle, formType, formPriority, formStatus,
    formPoints, formSprintId, formDescription, formLabels, formCriteria,
  ]);

  useEffect(() => {
    if (!editingItem) return;
    const snapshot = JSON.stringify({
      formTitle, formType, formPriority, formStatus,
      formPoints, formSprintId, formDescription, formLabels, formCriteria,
    });
    if (snapshot === lastSavedRef.current) return;
    lastSavedRef.current = snapshot;
    triggerAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formTitle, formType, formPriority, formStatus,
    formPoints, formSprintId, formDescription, formLabels, formCriteria,
  ]);

  // -------------------------------------------------------------------------
  // Delete handler
  // -------------------------------------------------------------------------
  const handleDelete = useCallback(async () => {
    if (!projectId || !editingItem) return;
    setDeleting(true);
    try {
      await backlogApi.delete(projectId, editingItem.id);
      setItems((prev) => prev.filter((i) => i.id !== editingItem.id));
      addToast('success', `"${editingItem.title}" deleted`);
      setConfirmOpen(false);
      closePanel();
    } catch {
      addToast('error', 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  }, [projectId, editingItem, addToast, closePanel]);

  // -------------------------------------------------------------------------
  // Label helpers
  // -------------------------------------------------------------------------
  const addLabel = useCallback(() => {
    const label = formLabelInput.trim();
    if (label && !formLabels.includes(label)) {
      setFormLabels((prev) => [...prev, label]);
    }
    setFormLabelInput('');
  }, [formLabelInput, formLabels]);

  const removeLabel = useCallback((label: string) => {
    setFormLabels((prev) => prev.filter((l) => l !== label));
  }, []);

  // -------------------------------------------------------------------------
  // Acceptance criteria helpers
  // -------------------------------------------------------------------------
  const addCriterion = useCallback(() => {
    setFormCriteria((prev) => [...prev, { text: '', checked: false }]);
  }, []);

  const updateCriterion = useCallback((index: number, updates: Partial<AcceptanceCriteria>) => {
    setFormCriteria((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  }, []);

  const removeCriterion = useCallback((index: number) => {
    setFormCriteria((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // -------------------------------------------------------------------------
  // Complete sprint
  // -------------------------------------------------------------------------
  const handleCompleteSprint = useCallback(async () => {
    if (!projectId || !activeSprint) return;
    setCompleting(true);
    try {
      await sprintsApi.complete(projectId, activeSprint.id, { action: completeAction });
      addToast('success', `${activeSprint.name} completed`);
      setCompleteModalOpen(false);
      loadData();
    } catch {
      addToast('error', 'Failed to complete sprint');
    } finally {
      setCompleting(false);
    }
  }, [projectId, activeSprint, completeAction, addToast, loadData]);

  // -------------------------------------------------------------------------
  // renderDetailPanel
  // -------------------------------------------------------------------------
  const renderDetailPanel = () => {
    return (
      <SlidePanel isOpen={panelOpen} onClose={closePanel} width={420}>
        {/* Panel Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          {/* Top row: save status + delete + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 20 }}>
              {saveStatus === 'saving' && (
                <>
                  <Loader2 size={14} color="#64748B" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 12, color: '#64748B' }}>Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check size={14} color="#10B981" strokeWidth={2.5} />
                  <span style={{ fontSize: 12, color: '#10B981', fontWeight: 500 }}>Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>Save failed</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => setConfirmOpen(true)}
                style={{
                  padding: 6, borderRadius: 6, color: '#EF4444', cursor: 'pointer',
                  border: 'none', backgroundColor: 'transparent', transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                title="Delete item"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
              <button
                onClick={closePanel}
                style={{
                  padding: 6, borderRadius: 6, color: '#94A3B8', cursor: 'pointer',
                  border: 'none', backgroundColor: 'transparent', transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                aria-label="Close panel"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(Object.keys(TYPE_CONFIG) as Array<BacklogItem['type']>).map((t) => {
              const cfg = TYPE_CONFIG[t];
              const TypeIcon = cfg.icon;
              const isActive = formType === t;
              return (
                <button
                  key={t}
                  onClick={() => setFormType(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 6,
                    border: isActive ? `1.5px solid ${cfg.color}` : '1.5px solid transparent',
                    backgroundColor: isActive ? `${cfg.color}15` : '#F8FAFC',
                    color: isActive ? cfg.color : '#94A3B8',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    transition: 'all 150ms ease',
                  }}
                >
                  <TypeIcon size={14} strokeWidth={2.5} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Title input */}
          <input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Item title..."
            style={{
              width: '100%', fontSize: 18, fontWeight: 600, color: '#0F172A',
              border: 'none', borderBottom: '2px solid transparent',
              padding: '6px 0', outline: 'none', backgroundColor: 'transparent',
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
          />
        </div>

        {/* Panel Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 100, fontSize: 13, fontWeight: 500, color: '#64748B', flexShrink: 0 }}>Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as BacklogItem['status'])} style={fieldStyle}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 100, fontSize: 13, fontWeight: 500, color: '#64748B', flexShrink: 0 }}>Priority</label>
              <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as BacklogItem['priority'])} style={fieldStyle}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Sprint */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 100, fontSize: 13, fontWeight: 500, color: '#64748B', flexShrink: 0 }}>Sprint</label>
              <select value={formSprintId || ''} onChange={(e) => setFormSprintId(e.target.value || null)} style={fieldStyle}>
                <option value="">Unassigned</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Story Points */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <label style={{ width: 100, fontSize: 13, fontWeight: 500, color: '#64748B', flexShrink: 0, paddingTop: 6 }}>Story Points</label>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {POINTS_OPTIONS.map((pt) => {
                    const isActive = formPoints === pt;
                    return (
                      <button
                        key={pt}
                        onClick={() => {
                          if (isActive) { setFormPoints(null); setFormCustomPoints(''); }
                          else { setFormPoints(pt); setFormCustomPoints(String(pt)); }
                        }}
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          border: isActive ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
                          backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                          color: isActive ? '#2563EB' : '#334155',
                          fontSize: 14, fontWeight: 600, cursor: 'pointer',
                          transition: 'all 150ms ease',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {pt}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="number" min={0}
                  value={formCustomPoints}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormCustomPoints(val);
                    const num = parseInt(val, 10);
                    setFormPoints(isNaN(num) || val === '' ? null : num);
                  }}
                  placeholder="Custom"
                  style={{ ...fieldStyle, width: 100 }}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe this item..."
              style={{ ...fieldStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', lineHeight: '20px' }}
            />
          </div>

          {/* Labels */}
          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>Labels</label>
            {formLabels.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {formLabels.map((label) => (
                  <span key={label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 999,
                    backgroundColor: `${hashStringToColor(label)}1A`,
                    color: hashStringToColor(label), fontSize: 12, fontWeight: 600,
                  }}>
                    {label}
                    <button
                      onClick={() => removeLabel(label)}
                      style={{ padding: 0, color: 'inherit', cursor: 'pointer', display: 'flex', border: 'none', backgroundColor: 'transparent' }}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={formLabelInput}
                onChange={(e) => setFormLabelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
                placeholder="Add label..."
                style={{ ...fieldStyle, flex: 1 }}
              />
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div style={{ marginTop: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>Acceptance Criteria</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {formCriteria.map((criterion, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => updateCriterion(index, { checked: !criterion.checked })}
                    style={{
                      width: 20, height: 20, minWidth: 20, borderRadius: 4,
                      border: criterion.checked ? '2px solid #10B981' : '2px solid #CBD5E1',
                      backgroundColor: criterion.checked ? '#10B981' : '#FFFFFF',
                      color: '#FFFFFF', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 150ms ease',
                    }}
                  >
                    {criterion.checked && <Check size={12} strokeWidth={3} />}
                  </button>
                  <input
                    value={criterion.text}
                    onChange={(e) => updateCriterion(index, { text: e.target.value })}
                    placeholder="Criterion..."
                    style={{
                      ...fieldStyle, flex: 1,
                      textDecoration: criterion.checked ? 'line-through' : 'none',
                      color: criterion.checked ? '#94A3B8' : '#0F172A',
                    }}
                  />
                  <button
                    onClick={() => removeCriterion(index)}
                    style={{ padding: 4, color: '#94A3B8', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', flexShrink: 0, transition: 'color 150ms' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addCriterion}
              style={{
                marginTop: 8, padding: '6px 12px', fontSize: 13, fontWeight: 500,
                color: '#2563EB', backgroundColor: 'transparent', border: 'none',
                cursor: 'pointer', borderRadius: 6, transition: 'background-color 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              + Add criterion
            </button>
          </div>

          {/* Criteria progress */}
          {formCriteria.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <ProgressBar
                value={(formCriteria.filter((c) => c.checked).length / formCriteria.length) * 100}
                height={6} showLabel
              />
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
          {editingItem && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8' }}>
              <span>Created: {formatDate(editingItem.created_at)}</span>
              <span>Updated: {formatDate(editingItem.updated_at)}</span>
            </div>
          )}
        </div>
      </SlidePanel>
    );
  };

  // -------------------------------------------------------------------------
  // renderCompleteSprintModal
  // -------------------------------------------------------------------------
  const renderCompleteSprintModal = () => {
    if (!completeModalOpen || !activeSprint) return null;

    const incompleteCount = items.filter((i) => i.status !== 'done').length;

    const content = (
      <>
        <div
          onClick={() => setCompleteModalOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            pointerEvents: 'auto',
            animation: 'fadeIn 150ms ease forwards',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            width: 440,
            maxWidth: '90vw',
            zIndex: 1001,
            pointerEvents: 'auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            animation: 'fadeInUp 200ms ease forwards',
          }}
        >
          <h3 style={{ marginBottom: 8 }}>Complete {activeSprint.name}?</h3>

          {incompleteCount > 0 ? (
            <>
              <p style={{ color: '#64748B', fontSize: 14, lineHeight: '22px', marginBottom: 16 }}>
                {incompleteCount} item{incompleteCount !== 1 ? 's are' : ' is'} not done.
                What would you like to do with {incompleteCount !== 1 ? 'them' : 'it'}?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: completeAction === 'move_to_backlog' ? '2px solid #2563EB' : '2px solid #E2E8F0',
                    backgroundColor: completeAction === 'move_to_backlog' ? '#EFF6FF' : '#FFFFFF',
                    transition: 'all 150ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="complete-action"
                    value="move_to_backlog"
                    checked={completeAction === 'move_to_backlog'}
                    onChange={() => setCompleteAction('move_to_backlog')}
                    style={{ accentColor: '#2563EB' }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>Move to backlog</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Incomplete items return to the product backlog</div>
                  </div>
                </label>
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: completeAction === 'move_to_next_sprint' ? '2px solid #2563EB' : '2px solid #E2E8F0',
                    backgroundColor: completeAction === 'move_to_next_sprint' ? '#EFF6FF' : '#FFFFFF',
                    transition: 'all 150ms ease',
                  }}
                >
                  <input
                    type="radio"
                    name="complete-action"
                    value="move_to_next_sprint"
                    checked={completeAction === 'move_to_next_sprint'}
                    onChange={() => setCompleteAction('move_to_next_sprint')}
                    style={{ accentColor: '#2563EB' }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>Move to next sprint</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Carry over incomplete items to the next sprint</div>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <p style={{ color: '#64748B', fontSize: 14, lineHeight: '22px', marginBottom: 20 }}>
              All items are done. Great work!
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setCompleteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteSprint} loading={completing}>
              Complete Sprint
            </Button>
          </div>
        </div>
      </>
    );

    if (overlayContainer) {
      return createPortal(content, overlayContainer);
    }
    return content;
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <Skeleton width="100%" height={100} borderRadius={12} style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ flex: 1, minWidth: 200 }}>
              <Skeleton width="60%" height={20} style={{ marginBottom: 12 }} />
              <Skeleton height={100} borderRadius={8} style={{ marginBottom: 8 }} />
              <Skeleton height={80} borderRadius={8} style={{ marginBottom: 8 }} />
              {i < 2 && <Skeleton height={90} borderRadius={8} />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activeSprint) {
    return (
      <EmptyState
        icon="🏃"
        title="No active sprint"
        description="Start a sprint from the backlog or sprints page to see your board."
        action={{
          label: 'Go to Backlog',
          onClick: () => navigate(`/projects/${projectId}/backlog`),
        }}
      />
    );
  }

  return (
    <div style={{ padding: '32px 0' }}>
      {/* Sprint Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {activeSprint.name}
            </h2>
            <StatusBadge status="active" />
          </div>
          <Button variant="secondary" onClick={() => setCompleteModalOpen(true)}>
            Complete Sprint
          </Button>
        </div>

        {activeSprint.goal && (
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 12 }}>
            {activeSprint.goal}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <ProgressBar value={progressPercent} height={6} showLabel />
          </div>
          <span style={{ fontSize: 13, color: '#64748B', whiteSpace: 'nowrap', fontWeight: 500 }}>
            {completedPoints}/{totalPoints} pts
          </span>
          {daysRemaining !== null && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: daysRemaining <= 2 ? '#EF4444' : '#64748B',
                whiteSpace: 'nowrap',
              }}
            >
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left
            </span>
          )}
        </div>
      </div>

      {/* Board Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            minHeight: 'calc(100vh - 300px)',
          }}
        >
          {BOARD_COLUMNS.map((col) => (
            <DroppableColumn
              key={col.status}
              column={col}
              items={columnItems[col.status] || []}
              onOpenItem={openEditPanel}
              onQuickAdd={(status) => {
                setQuickAddStatus(status);
                setQuickAddValue('');
              }}
              quickAddStatus={quickAddStatus}
              quickAddValue={quickAddValue}
              onQuickAddChange={setQuickAddValue}
              onQuickAddSubmit={handleQuickAdd}
              onQuickAddCancel={() => {
                setQuickAddStatus(null);
                setQuickAddValue('');
              }}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem ? <StaticBoardCard item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Item Detail Panel */}
      {renderDetailPanel()}

      {/* Complete Sprint Modal */}
      {renderCompleteSprintModal()}

      {/* Confirm Dialog (Delete) */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete this item?"
        message="This action cannot be undone. The item will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
