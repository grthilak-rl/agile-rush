import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ListChecks,
  Bug,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { calendarApi, backlogApi, sprintsApi, membersApi } from '../api/client';
import type { CalendarItemData, CalendarSprintData } from '../api/client';
import type { Sprint, BacklogItem } from '../types';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { useProjectWebSocket, type WSEvent } from '../hooks/useProjectWebSocket';
import { SlidePanel } from '../components/ui/SlidePanel';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, { icon: typeof BookOpen; color: string; label: string }> = {
  story: { icon: BookOpen, color: '#3B82F6', label: 'Story' },
  task: { icon: ListChecks, color: '#8B5CF6', label: 'Task' },
  bug: { icon: Bug, color: '#F43F5E', label: 'Bug' },
};

function getMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday start
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  return start;
}

function getWeekEnd(d: Date): Date {
  const start = getWeekStart(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWeekend(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Droppable calendar cell
// ---------------------------------------------------------------------------

function DroppableCell({
  dateStr,
  children,
  isToday,
  isCurrentMonth,
  isWeekendDay,
  onClickEmpty,
}: {
  dateStr: string;
  children: React.ReactNode;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekendDay: boolean;
  onClickEmpty: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${dateStr}` });
  const [hovered, setHovered] = useState(false);

  let bg = '#FFFFFF';
  if (isToday) bg = '#EFF6FF';
  else if (isWeekendDay) bg = '#FAFAFA';
  else if (!isCurrentMonth) bg = '#F8FAFC';
  if (isOver) bg = '#DBEAFE';
  else if (hovered && !isToday) bg = isWeekendDay ? '#F5F5F5' : '#F8FAFC';

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-pill]')) return;
        onClickEmpty();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minHeight: 100,
        padding: 4,
        borderRight: '1px solid #F1F5F9',
        borderBottom: '1px solid #F1F5F9',
        backgroundColor: bg,
        transition: 'background-color 100ms ease',
        cursor: 'crosshair',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable pill
// ---------------------------------------------------------------------------

function DraggablePill({
  item,
  onClick,
}: {
  item: CalendarItemData;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.task;
  const isDone = item.status === 'done';

  return (
    <div
      ref={setNodeRef}
      data-pill="true"
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        backgroundColor: `${cfg.color}15`,
        color: cfg.color,
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDone ? 0.5 : isDragging ? 0.6 : 1,
        textDecoration: isDone ? 'line-through' : 'none',
        border: item.is_overdue ? '1px solid #EF4444' : '1px solid transparent',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
        touchAction: 'none',
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        zIndex: isDragging ? 100 : undefined,
      }}
      title={item.title}
    >
      <cfg.icon size={10} strokeWidth={2.5} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// More items popover
// ---------------------------------------------------------------------------

function MoreItemsPopover({
  items,
  dateLabel,
  onClose,
  onItemClick,
}: {
  items: CalendarItemData[];
  dateLabel: string;
  onClose: () => void;
  onItemClick: (item: CalendarItemData) => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          padding: 8,
          minWidth: 180,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>{dateLabel}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.task;
            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: 'pointer',
                  backgroundColor: `${cfg.color}10`,
                  color: cfg.color,
                }}
              >
                <cfg.icon size={12} strokeWidth={2.5} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sprint bar
// ---------------------------------------------------------------------------

function SprintBar({
  sprint,
  calendarStart,
  calendarEnd,
  totalDays,
}: {
  sprint: CalendarSprintData;
  calendarStart: Date;
  calendarEnd: Date;
  totalDays: number;
}) {
  if (!sprint.start_date || !sprint.end_date) return null;

  const sStart = new Date(sprint.start_date + 'T00:00:00');
  const sEnd = new Date(sprint.end_date + 'T00:00:00');
  const visibleStart = sStart < calendarStart ? calendarStart : sStart;
  const visibleEnd = sEnd > calendarEnd ? calendarEnd : sEnd;

  const startOffset = Math.max(0, Math.floor((visibleStart.getTime() - calendarStart.getTime()) / 86400000));
  const endOffset = Math.min(totalDays, Math.floor((visibleEnd.getTime() - calendarStart.getTime()) / 86400000) + 1);

  const leftPct = (startOffset / totalDays) * 100;
  const widthPct = ((endOffset - startOffset) / totalDays) * 100;

  let bg = '#2563EB';
  let opacity = 1;
  let borderStyle = 'solid';
  if (sprint.status === 'completed') {
    bg = '#10B981';
    opacity = 0.6;
  } else if (sprint.status === 'planning') {
    bg = '#F97316';
    borderStyle = 'dashed';
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height: 20,
        borderRadius: 4,
        backgroundColor: sprint.status === 'planning' ? 'transparent' : bg,
        border: sprint.status === 'planning' ? `2px ${borderStyle} ${bg}` : 'none',
        opacity,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 8,
        fontSize: 11,
        fontWeight: 600,
        color: sprint.status === 'planning' ? bg : '#FFFFFF',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
      title={`${sprint.name}: ${sprint.start_date} - ${sprint.end_date}`}
    >
      {sprint.name}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick create input in cell
// ---------------------------------------------------------------------------

function QuickCreateInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <input
      ref={inputRef}
      placeholder="Enter task title..."
      style={{
        width: '100%',
        padding: '2px 4px',
        fontSize: 11,
        border: '1px solid #2563EB',
        borderRadius: 4,
        outline: 'none',
        backgroundColor: '#FFFFFF',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const val = (e.target as HTMLInputElement).value.trim();
          if (val) onSubmit(val);
        } else if (e.key === 'Escape') {
          onCancel();
        }
      }}
      onBlur={onCancel}
    />
  );
}


// ---------------------------------------------------------------------------
// Calendar skeleton
// ---------------------------------------------------------------------------

function CalendarSkeleton() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Skeleton width={200} height={32} />
        <Skeleton width={150} height={32} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`h-${i}`} width="100%" height={32} borderRadius={0} />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={`c-${i}`} width="100%" height={100} borderRadius={0} style={{ margin: 1 }} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user: currentUser } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CalendarItemData[]>([]);
  const [sprints, setSprints] = useState<CalendarSprintData[]>([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [sprintFilter, setSprintFilter] = useState<string>('all');

  // Members list for filter dropdown
  const [allMembers, setAllMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);

  // Quick create
  const [quickCreateDate, setQuickCreateDate] = useState<string | null>(null);

  // More items popover
  const [morePopoverDate, setMorePopoverDate] = useState<string | null>(null);

  // Selected item for detail panel
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<BacklogItem | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  // Drag state
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Ref for loadData for WS
  const loadDataRef = useRef<() => void>(() => {});

  // ---------------------------------------------------------------------------
  // Date range computation
  // ---------------------------------------------------------------------------

  const { rangeStart, rangeEnd, calendarGridStart } = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = getMonthStart(currentDate);
      // Calendar grid starts on Monday before month start
      const startDay = monthStart.getDay();
      const gridOffset = startDay === 0 ? 6 : startDay - 1; // Monday = 0
      const gridStart = new Date(monthStart);
      gridStart.setDate(monthStart.getDate() - gridOffset);
      // We want 6 weeks (42 days) for the grid
      const gridEnd = new Date(gridStart);
      gridEnd.setDate(gridStart.getDate() + 41);
      return {
        rangeStart: gridStart,
        rangeEnd: gridEnd,
        calendarGridStart: gridStart,
      };
    } else {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = getWeekEnd(currentDate);
      return {
        rangeStart: weekStart,
        rangeEnd: weekEnd,
        calendarGridStart: weekStart,
      };
    }
  }, [currentDate, viewMode]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const startStr = formatDateISO(rangeStart);
      const endStr = formatDateISO(rangeEnd);
      const [calRes] = await Promise.all([
        calendarApi.get(projectId, startStr, endStr),
      ]);
      setItems(calRes.data.items);
      setSprints(calRes.data.sprints);
    } catch {
      addToast('error', 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [projectId, rangeStart, rangeEnd, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  // Load members and sprints for filters (once)
  useEffect(() => {
    if (!projectId) return;
    membersApi.list(projectId).then((res) => {
      setAllMembers(
        res.data
          .filter((m) => m.status === 'active' && m.user)
          .map((m) => ({ id: m.user.id, full_name: m.user.full_name }))
      );
    }).catch(() => {});
    sprintsApi.list(projectId).then((res) => {
      setAllSprints(res.data);
    }).catch(() => {});
  }, [projectId]);

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------

  const handleWSEvent = useCallback((event: WSEvent) => {
    const d = event.data as Record<string, string>;
    // Ignore own events
    if (
      d.created_by === currentUser?.id ||
      d.updated_by === currentUser?.id ||
      d.deleted_by === currentUser?.id
    ) return;

    switch (event.type) {
      case 'item:created':
      case 'item:updated':
      case 'item:status_changed':
        loadDataRef.current();
        break;
      case 'item:deleted':
        setItems((prev) => prev.filter((i) => i.id !== d.item_id));
        break;
    }
  }, [currentUser?.id]);

  useProjectWebSocket(projectId, handleWSEvent);

  // ---------------------------------------------------------------------------
  // Filtered items
  // ---------------------------------------------------------------------------

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (memberFilter !== 'all') {
        if (memberFilter === 'me') {
          if (item.assignee?.id !== currentUser?.id) return false;
        } else {
          if (item.assignee?.id !== memberFilter) return false;
        }
      }
      if (sprintFilter !== 'all' && item.sprint?.id !== sprintFilter) return false;
      return true;
    });
  }, [items, typeFilter, memberFilter, sprintFilter, currentUser?.id]);

  // Group items by date (due_date)
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItemData[]>();
    for (const item of filteredItems) {
      const d = item.due_date || item.start_date;
      if (d) {
        const existing = map.get(d) || [];
        existing.push(item);
        map.set(d, existing);
      }
    }
    return map;
  }, [filteredItems]);

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goToPrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  };

  const goToNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return d;
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  // ---------------------------------------------------------------------------
  // Quick create handler
  // ---------------------------------------------------------------------------

  const handleQuickCreate = async (title: string, dateStr: string) => {
    if (!projectId) return;
    setQuickCreateDate(null);
    try {
      await backlogApi.create(projectId, {
        title,
        due_date: dateStr,
        type: 'task',
        priority: 'medium',
        status: 'backlog',
      } as Partial<BacklogItem>);
      addToast('success', 'Item created');
      loadData();
    } catch {
      addToast('error', 'Failed to create item');
    }
  };

  // ---------------------------------------------------------------------------
  // Item detail panel
  // ---------------------------------------------------------------------------

  const openItemDetail = async (item: CalendarItemData) => {
    if (!projectId) return;
    setSelectedItemId(item.id);
    setPanelLoading(true);
    try {
      const res = await backlogApi.get(projectId, item.id);
      setSelectedItemDetail(res.data);
    } catch {
      addToast('error', 'Failed to load item details');
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setSelectedItemId(null);
    setSelectedItemDetail(null);
  };

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingItemId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingItemId(null);
    const { active, over } = event;
    if (!over || !projectId) return;

    const overId = over.id as string;
    if (!overId.startsWith('cell-')) return;

    const newDate = overId.replace('cell-', '');
    const itemId = active.id as string;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, due_date: newDate } : i))
    );

    try {
      await backlogApi.update(projectId, itemId, { due_date: newDate } as Partial<BacklogItem>);
    } catch {
      addToast('error', 'Failed to update due date');
      loadData(); // revert
    }
  };

  // ---------------------------------------------------------------------------
  // Generate calendar grid days
  // ---------------------------------------------------------------------------

  const gridDays = useMemo(() => {
    const days: Date[] = [];
    if (viewMode === 'month') {
      const start = new Date(calendarGridStart);
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
    } else {
      const start = new Date(calendarGridStart);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
    }
    return days;
  }, [calendarGridStart, viewMode]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ---------------------------------------------------------------------------
  // Title
  // ---------------------------------------------------------------------------

  const titleText = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    const ws = getWeekStart(currentDate);
    const we = getWeekEnd(currentDate);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(ws)} - ${fmt(we)}, ${we.getFullYear()}`;
  }, [currentDate, viewMode]);

  // ---------------------------------------------------------------------------
  // Sprint bars computation
  // ---------------------------------------------------------------------------

  const totalGridDays = gridDays.length;

  // ---------------------------------------------------------------------------
  // Dragging item for overlay
  // ---------------------------------------------------------------------------

  const draggingItem = draggingItemId ? items.find((i) => i.id === draggingItemId) : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading && items.length === 0) {
    return <CalendarSkeleton />;
  }

  const hasItems = items.length > 0;
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    backgroundColor: active ? '#2563EB' : '#F1F5F9',
    color: active ? '#FFFFFF' : '#64748B',
    transition: 'all 150ms ease',
  });

  const filterSelectStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={24} color="#2563EB" strokeWidth={2} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>Calendar</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={goToPrev} style={{ padding: 6, borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex' }} aria-label="Previous">
            <ChevronLeft size={18} color="#334155" />
          </button>
          <button onClick={goToToday} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#334155', cursor: 'pointer' }}>
            Today
          </button>
          <span
            style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', minWidth: 180, textAlign: 'center', cursor: 'pointer' }}
            onClick={goToToday}
            title="Jump to today"
          >
            {titleText}
          </span>
          <button onClick={goToNext} style={{ padding: 6, borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex' }} aria-label="Next">
            <ChevronRight size={18} color="#334155" />
          </button>

          <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0', margin: '0 4px' }} />

          <button onClick={() => setViewMode('month')} style={btnStyle(viewMode === 'month')}>Month</button>
          <button onClick={() => setViewMode('week')} style={btnStyle(viewMode === 'week')}>Week</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={filterSelectStyle}>
          <option value="all">All Types</option>
          <option value="story">Story</option>
          <option value="task">Task</option>
          <option value="bug">Bug</option>
        </select>
        <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} style={filterSelectStyle}>
          <option value="all">All Members</option>
          <option value="me">Me</option>
          {allMembers.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
        <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)} style={filterSelectStyle}>
          <option value="all">All Sprints</option>
          {allSprints.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {!hasItems && !loading ? (
        <EmptyState
          icon={<Calendar size={48} color="#94A3B8" />}
          title="No items with due dates"
          description="Set due dates on your backlog items to see them here."
          action={{
            label: 'Go to Backlog',
            onClick: () => navigate(`/projects/${projectId}/backlog`),
          }}
        />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Calendar grid */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {DAY_HEADERS.map((day) => (
                <div
                  key={day}
                  style={{
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #F1F5F9',
                    borderRight: '1px solid #F1F5F9',
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {gridDays.map((day) => {
                const dateStr = formatDateISO(day);
                const dayItems = itemsByDate.get(dateStr) || [];
                const isDayToday = isSameDay(day, today);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isWeekendDay = isWeekend(day);
                const visibleItems = dayItems.slice(0, 3);
                const extraCount = dayItems.length - 3;
                const isQuickCreating = quickCreateDate === dateStr;

                return (
                  <DroppableCell
                    key={dateStr}
                    dateStr={dateStr}
                    isToday={isDayToday}
                    isCurrentMonth={isCurrentMonth}
                    isWeekendDay={isWeekendDay}
                    onClickEmpty={() => {
                      setMorePopoverDate(null);
                      setQuickCreateDate(dateStr);
                    }}
                  >
                    {/* Date number */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        padding: '2px 4px',
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isCurrentMonth ? 600 : 400,
                          color: isDayToday ? '#FFFFFF' : isCurrentMonth ? '#0F172A' : '#94A3B8',
                          backgroundColor: isDayToday ? '#2563EB' : 'transparent',
                          borderRadius: '50%',
                          width: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
                      {viewMode === 'week' ? (
                        // Week view: larger cards
                        dayItems.map((item) => {
                          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.task;
                          const isDone = item.status === 'done';
                          return (
                            <div
                              key={item.id}
                              data-pill="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                openItemDetail(item);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 8px',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 500,
                                backgroundColor: `${cfg.color}10`,
                                color: isDone ? '#94A3B8' : '#0F172A',
                                cursor: 'pointer',
                                border: item.is_overdue ? '1px solid #EF4444' : `1px solid ${cfg.color}30`,
                                opacity: isDone ? 0.6 : 1,
                                textDecoration: isDone ? 'line-through' : 'none',
                              }}
                            >
                              <cfg.icon size={13} color={cfg.color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                              {item.assignee && (
                                <Avatar name={item.assignee.full_name} size={20} />
                              )}
                            </div>
                          );
                        })
                      ) : (
                        // Month view: pills
                        <>
                          {visibleItems.map((item) => (
                            <DraggablePill
                              key={item.id}
                              item={item}
                              onClick={() => openItemDetail(item)}
                            />
                          ))}
                          {extraCount > 0 && (
                            <button
                              data-pill="true"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMorePopoverDate(dateStr);
                              }}
                              style={{
                                padding: '1px 4px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#2563EB',
                                backgroundColor: '#EFF6FF',
                                border: 'none',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              +{extraCount} more
                            </button>
                          )}
                        </>
                      )}

                      {morePopoverDate === dateStr && dayItems.length > 3 && (
                        <MoreItemsPopover
                          items={dayItems}
                          dateLabel={day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          onClose={() => setMorePopoverDate(null)}
                          onItemClick={(item) => {
                            setMorePopoverDate(null);
                            openItemDetail(item);
                          }}
                        />
                      )}
                    </div>

                    {/* Quick create */}
                    {isQuickCreating && (
                      <div style={{ marginTop: 2 }}>
                        <QuickCreateInput
                          onSubmit={(title) => handleQuickCreate(title, dateStr)}
                          onCancel={() => setQuickCreateDate(null)}
                        />
                      </div>
                    )}
                  </DroppableCell>
                );
              })}
            </div>
          </div>

          {/* Sprint bars */}
          {sprints.length > 0 && (
            <div style={{ position: 'relative', height: 32 * sprints.length, marginTop: 12 }}>
              {sprints.map((sprint, idx) => (
                <div key={sprint.id} style={{ position: 'absolute', top: idx * 28, left: 0, right: 0, height: 24 }}>
                  <SprintBar
                    sprint={sprint}
                    calendarStart={calendarGridStart}
                    calendarEnd={gridDays[gridDays.length - 1]}
                    totalDays={totalGridDays}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Drag overlay */}
          <DragOverlay>
            {draggingItem ? (
              (() => {
                const cfg = TYPE_CONFIG[draggingItem.type] || TYPE_CONFIG.task;
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: cfg.color,
                      color: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <cfg.icon size={12} strokeWidth={2.5} />
                    {draggingItem.title.length > 20 ? draggingItem.title.substring(0, 20) + '...' : draggingItem.title}
                  </div>
                );
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Item detail slide panel */}
      <SlidePanel
        isOpen={!!selectedItemId}
        onClose={closePanel}
        title={selectedItemDetail?.title || 'Loading...'}
      >
        {panelLoading ? (
          <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
            <Loader2 size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : selectedItemDetail ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Type & Status */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(() => {
                const cfg = TYPE_CONFIG[selectedItemDetail.type] || TYPE_CONFIG.task;
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                    <cfg.icon size={13} strokeWidth={2.5} />
                    {cfg.label}
                  </span>
                );
              })()}
              <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, backgroundColor: '#F1F5F9', color: '#334155' }}>
                {selectedItemDetail.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <span style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: (({
                  critical: '#FEF2F2', high: '#FFF7ED', medium: '#FEFCE8', low: '#EFF6FF',
                } as Record<string, string>)[selectedItemDetail.priority]) || '#F1F5F9',
                color: (({
                  critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#3B82F6',
                } as Record<string, string>)[selectedItemDetail.priority]) || '#64748B',
              }}>
                {selectedItemDetail.priority.charAt(0).toUpperCase() + selectedItemDetail.priority.slice(1)}
              </span>
            </div>

            {/* Details */}
            {selectedItemDetail.description && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.6, margin: 0 }}>{selectedItemDetail.description}</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Assignee</div>
                <div style={{ fontSize: 14, color: '#0F172A' }}>
                  {selectedItemDetail.assignee ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Avatar name={selectedItemDetail.assignee.full_name} size={20} />
                      {selectedItemDetail.assignee.full_name}
                    </span>
                  ) : (
                    <span style={{ color: '#94A3B8' }}>Unassigned</span>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Story Points</div>
                <div style={{ fontSize: 14, color: '#0F172A' }}>{selectedItemDetail.story_points ?? '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Due Date</div>
                <div style={{ fontSize: 14, color: '#0F172A' }}>
                  {selectedItemDetail.due_date
                    ? new Date(selectedItemDetail.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Sprint</div>
                <div style={{ fontSize: 14, color: '#0F172A' }}>{selectedItemDetail.sprint_id ? allSprints.find((s) => s.id === selectedItemDetail.sprint_id)?.name || '-' : '-'}</div>
              </div>
            </div>

            {/* Labels */}
            {selectedItemDetail.labels && selectedItemDetail.labels.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>Labels</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {selectedItemDetail.labels.map((label) => (
                    <span key={label} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, backgroundColor: '#F1F5F9', color: '#334155' }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Open in backlog link */}
            <button
              onClick={() => {
                closePanel();
                navigate(`/projects/${projectId}/backlog`);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Open in Backlog
            </button>
          </div>
        ) : null}
      </SlidePanel>
    </div>
  );
}
