import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  GripVertical,
  BookOpen,
  ListChecks,
  Bug,
  Play,
  Pencil,
  Check,
  X,
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
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { sprintsApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import type { BacklogItem, Sprint, SprintCapacity } from '../types';
import { Button } from '../components/ui/Button';
import { PriorityBadge, TypeBadge } from '../components/ui/Badge';
import { PointsBadge } from '../components/ui/PointsBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TYPE_CONFIG = {
  story: { icon: BookOpen, color: '#3B82F6', label: 'Story' },
  task: { icon: ListChecks, color: '#8B5CF6', label: 'Task' },
  bug: { icon: Bug, color: '#F43F5E', label: 'Bug' },
} as const;

function sumPoints(items: BacklogItem[]): number {
  return items.reduce((sum, item) => sum + (item.story_points || 0), 0);
}

// ---------------------------------------------------------------------------
// SortablePlanItem
// ---------------------------------------------------------------------------

function SortablePlanItem({
  item,
  selected,
  onToggleSelect,
  isMobile,
}: {
  item: BacklogItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  isMobile: boolean;
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    backgroundColor: selected ? '#EFF6FF' : '#FFFFFF',
    border: selected ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
    borderRadius: 10,
    cursor: isMobile ? 'default' : 'grab',
    userSelect: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Checkbox */}
      <label
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          style={{ width: 16, height: 16, accentColor: '#2563EB', cursor: 'pointer' }}
        />
      </label>

      {/* Drag handle */}
      {!isMobile && (
        <div
          {...listeners}
          style={{ cursor: 'grab', color: '#94A3B8', flexShrink: 0, display: 'flex' }}
        >
          <GripVertical size={16} strokeWidth={2} />
        </div>
      )}

      {/* Type icon */}
      <div
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          borderRadius: 6,
          backgroundColor: `${cfg.color}1A`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <TypeIcon size={14} color={cfg.color} strokeWidth={2} />
      </div>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 500,
          color: '#0F172A',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.title}
      </span>

      {/* Priority badge */}
      <PriorityBadge priority={item.priority} />

      {/* Story points */}
      <PointsBadge points={item.story_points} size={26} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static PlanItem (for DragOverlay)
// ---------------------------------------------------------------------------

function PlanItemOverlay({ item }: { item: BacklogItem }) {
  const cfg = TYPE_CONFIG[item.type];
  const TypeIcon = cfg.icon;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        backgroundColor: '#FFFFFF',
        border: '2px solid #2563EB',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.18)',
        cursor: 'grabbing',
        userSelect: 'none',
        width: 400,
        maxWidth: '90vw',
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          borderRadius: 6,
          backgroundColor: `${cfg.color}1A`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <TypeIcon size={14} color={cfg.color} strokeWidth={2} />
      </div>
      <span
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 500,
          color: '#0F172A',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {item.title}
      </span>
      <PriorityBadge priority={item.priority} />
      <PointsBadge points={item.story_points} size={26} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DroppablePanel
// ---------------------------------------------------------------------------

function DroppablePanel({
  id,
  children,
  isOver,
  isEmpty,
}: {
  id: string;
  children: React.ReactNode;
  isOver?: boolean;
  isEmpty?: boolean;
}) {
  const { setNodeRef, isOver: droppableIsOver } = useDroppable({ id });
  const active = isOver || droppableIsOver;

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minHeight: 200,
        padding: 4,
        borderRadius: 10,
        backgroundColor: active ? '#EFF6FF' : 'transparent',
        border: isEmpty ? '2px dashed #CBD5E1' : '2px dashed transparent',
        transition: 'background-color 200ms ease, border-color 200ms ease',
        ...(active && isEmpty ? { borderColor: '#2563EB' } : {}),
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CapacityBar
// ---------------------------------------------------------------------------

function CapacityBar({
  totalPoints,
  velocity,
  status,
}: {
  totalPoints: number;
  velocity: number | null;
  status: 'under' | 'at' | 'over';
}) {
  if (velocity === null || velocity === 0) {
    return (
      <div
        style={{
          padding: '8px 14px',
          backgroundColor: '#F1F5F9',
          borderRadius: 8,
          fontSize: 13,
          color: '#64748B',
          fontWeight: 500,
        }}
      >
        No velocity data yet
      </div>
    );
  }

  const pct = Math.min((totalPoints / velocity) * 100, 100);
  const barColor =
    status === 'over' ? '#F43F5E' : status === 'at' ? '#EAB308' : '#10B981';

  return (
    <div style={{ padding: '8px 0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
          Capacity
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: barColor }}>
          {totalPoints}/{velocity} pts
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 8,
          backgroundColor: '#E2E8F0',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 999,
            transition: 'width 300ms ease',
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SprintPlanningPage
// ---------------------------------------------------------------------------

export default function SprintPlanningPage() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Data state
  const [availableItems, setAvailableItems] = useState<BacklogItem[]>([]);
  const [sprintItems, setSprintItems] = useState<BacklogItem[]>([]);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [capacity, setCapacity] = useState<SprintCapacity | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
  const [selectedSprint, setSelectedSprint] = useState<Set<string>>(new Set());
  const [activeItem, setActiveItem] = useState<BacklogItem | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [startingSprintLoading, setStartingSprintLoading] = useState(false);
  const [movingAvailableToSprint, setMovingAvailableToSprint] = useState(false);
  const [movingSprintToAvailable, setMovingSprintToAvailable] = useState(false);
  const [mobileTab, setMobileTab] = useState<'available' | 'sprint'>('available');

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!projectId || !sprintId) return;
    setLoading(true);
    try {
      const [unassignedRes, itemsRes, capacityRes, sprintRes] = await Promise.all([
        sprintsApi.unassigned(projectId),
        sprintsApi.items(projectId, sprintId),
        sprintsApi.capacity(projectId, sprintId),
        sprintsApi.get(projectId, sprintId),
      ]);
      setAvailableItems(unassignedRes.data);
      setSprintItems(itemsRes.data);
      setCapacity(capacityRes.data);
      setSprint(sprintRes.data);
    } catch {
      addToast('error', 'Failed to load sprint planning data');
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintId, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Filtered available items
  // ---------------------------------------------------------------------------

  const filteredAvailable = useMemo(() => {
    if (!debouncedSearch.trim()) return availableItems;
    const q = debouncedSearch.toLowerCase();
    return availableItems.filter((item) => item.title.toLowerCase().includes(q));
  }, [availableItems, debouncedSearch]);

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  const toggleSelectAvailable = useCallback((id: string) => {
    setSelectedAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectSprint = useCallback((id: string) => {
    setSelectedSprint((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Bulk move: Available -> Sprint
  // ---------------------------------------------------------------------------

  const moveToSprint = useCallback(
    async (itemIds: string[]) => {
      if (!projectId || !sprintId || itemIds.length === 0) return;
      setMovingAvailableToSprint(true);

      // Optimistic update
      const movingItems = availableItems.filter((i) => itemIds.includes(i.id));
      const remaining = availableItems.filter((i) => !itemIds.includes(i.id));
      setAvailableItems(remaining);
      setSprintItems((prev) => [...prev, ...movingItems]);
      setSelectedAvailable(new Set());

      try {
        await sprintsApi.bulkMove(projectId, { item_ids: itemIds, sprint_id: sprintId });
        // Refresh capacity
        const capRes = await sprintsApi.capacity(projectId, sprintId);
        setCapacity(capRes.data);
        addToast('success', `Moved ${itemIds.length} item${itemIds.length > 1 ? 's' : ''} to sprint`);
      } catch {
        // Revert
        setAvailableItems((prev) => [...prev, ...movingItems]);
        setSprintItems((prev) => prev.filter((i) => !itemIds.includes(i.id)));
        addToast('error', 'Failed to move items to sprint');
      } finally {
        setMovingAvailableToSprint(false);
      }
    },
    [projectId, sprintId, availableItems, addToast]
  );

  // ---------------------------------------------------------------------------
  // Bulk move: Sprint -> Available
  // ---------------------------------------------------------------------------

  const moveToAvailable = useCallback(
    async (itemIds: string[]) => {
      if (!projectId || itemIds.length === 0) return;
      setMovingSprintToAvailable(true);

      // Optimistic update
      const movingItems = sprintItems.filter((i) => itemIds.includes(i.id));
      const remaining = sprintItems.filter((i) => !itemIds.includes(i.id));
      setSprintItems(remaining);
      setAvailableItems((prev) => [...prev, ...movingItems]);
      setSelectedSprint(new Set());

      try {
        await sprintsApi.bulkMove(projectId, { item_ids: itemIds, sprint_id: null });
        // Refresh capacity
        if (sprintId) {
          const capRes = await sprintsApi.capacity(projectId, sprintId);
          setCapacity(capRes.data);
        }
        addToast('success', `Removed ${itemIds.length} item${itemIds.length > 1 ? 's' : ''} from sprint`);
      } catch {
        // Revert
        setSprintItems((prev) => [...prev, ...movingItems]);
        setAvailableItems((prev) => prev.filter((i) => !itemIds.includes(i.id)));
        addToast('error', 'Failed to remove items from sprint');
      } finally {
        setMovingSprintToAvailable(false);
      }
    },
    [projectId, sprintId, sprintItems, addToast]
  );

  // ---------------------------------------------------------------------------
  // Drag & Drop handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string;
      const item =
        availableItems.find((i) => i.id === id) ||
        sprintItems.find((i) => i.id === id) ||
        null;
      setActiveItem(item);
    },
    [availableItems, sprintItems]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null);
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const fromAvailable = availableItems.some((i) => i.id === activeId);
      const fromSprint = sprintItems.some((i) => i.id === activeId);

      // Determine target container
      const isOverAvailableContainer =
        overId === 'available' || availableItems.some((i) => i.id === overId);
      const isOverSprintContainer =
        overId === 'sprint' || sprintItems.some((i) => i.id === overId);

      // Available -> Sprint
      if (fromAvailable && isOverSprintContainer) {
        moveToSprint([activeId]);
        return;
      }

      // Sprint -> Available
      if (fromSprint && isOverAvailableContainer) {
        moveToAvailable([activeId]);
        return;
      }
    },
    [availableItems, sprintItems, moveToSprint, moveToAvailable]
  );

  // ---------------------------------------------------------------------------
  // Sprint goal editing
  // ---------------------------------------------------------------------------

  const startEditGoal = useCallback(() => {
    setGoalDraft(sprint?.goal || '');
    setEditingGoal(true);
  }, [sprint]);

  const saveGoal = useCallback(async () => {
    if (!projectId || !sprintId) return;
    try {
      const res = await sprintsApi.update(projectId, sprintId, { goal: goalDraft });
      setSprint(res.data);
      setEditingGoal(false);
      addToast('success', 'Sprint goal updated');
    } catch {
      addToast('error', 'Failed to update sprint goal');
    }
  }, [projectId, sprintId, goalDraft, addToast]);

  const cancelEditGoal = useCallback(() => {
    setEditingGoal(false);
    setGoalDraft('');
  }, []);

  // ---------------------------------------------------------------------------
  // Start Sprint
  // ---------------------------------------------------------------------------

  const handleStartSprint = useCallback(async () => {
    if (!projectId || !sprintId) return;
    setStartingSprintLoading(true);
    try {
      await sprintsApi.start(projectId, sprintId);
      addToast('success', `${sprint?.name || 'Sprint'} started successfully`);
      navigate(`/projects/${projectId}/board`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Failed to start sprint';
      addToast('error', message);
    } finally {
      setStartingSprintLoading(false);
    }
  }, [projectId, sprintId, sprint, addToast, navigate]);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const availablePoints = sumPoints(filteredAvailable);
  const sprintPoints = sumPoints(sprintItems);

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <Skeleton width="20%" height={20} style={{ marginBottom: 24 }} />
        <Skeleton width="40%" height={32} style={{ marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height={24} style={{ marginBottom: 16 }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                width="100%"
                height={48}
                borderRadius={10}
                style={{ marginBottom: 8 }}
              />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height={24} style={{ marginBottom: 16 }} />
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                width="100%"
                height={48}
                borderRadius={10}
                style={{ marginBottom: 8 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Panel: Available Backlog
  // ---------------------------------------------------------------------------

  const availablePanel = (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
              }}
            >
              Available Backlog
            </h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#E2E8F0',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {filteredAvailable.length}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              {availablePoints} pts
            </span>
          </div>

          {selectedAvailable.size > 0 && (
            <Button
              size="sm"
              onClick={() => moveToSprint(Array.from(selectedAvailable))}
              loading={movingAvailableToSprint}
            >
              Move Selected to Sprint ({selectedAvailable.size})
            </Button>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            strokeWidth={2}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search backlog items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 13,
              color: '#0F172A',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Items */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <DroppablePanel id="available" isEmpty={filteredAvailable.length === 0}>
          {filteredAvailable.length === 0 ? (
            <EmptyState
              title="No items available"
              description="All items are assigned. Add new items from the backlog."
            />
          ) : (
            <SortableContext
              items={filteredAvailable.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredAvailable.map((item) => (
                  <SortablePlanItem
                    key={item.id}
                    item={item}
                    selected={selectedAvailable.has(item.id)}
                    onToggleSelect={toggleSelectAvailable}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </DroppablePanel>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Panel: Sprint Backlog
  // ---------------------------------------------------------------------------

  const sprintPanel = (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
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
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
              }}
            >
              {sprint?.name || 'Sprint Backlog'}
            </h2>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#E2E8F0',
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              {sprintItems.length}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>
              {sprintPoints} pts
            </span>
          </div>

          {selectedSprint.size > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => moveToAvailable(Array.from(selectedSprint))}
              loading={movingSprintToAvailable}
            >
              Remove Selected ({selectedSprint.size})
            </Button>
          )}
        </div>

        {/* Sprint goal */}
        <div style={{ marginBottom: 8 }}>
          {editingGoal ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="Enter sprint goal..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveGoal();
                  if (e.key === 'Escape') cancelEditGoal();
                }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
              <button
                onClick={saveGoal}
                style={{
                  padding: 4,
                  cursor: 'pointer',
                  color: '#10B981',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                }}
              >
                <Check size={16} strokeWidth={2} />
              </button>
              <button
                onClick={cancelEditGoal}
                style={{
                  padding: 4,
                  cursor: 'pointer',
                  color: '#94A3B8',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div
              onClick={startEditGoal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: sprint?.goal ? '#334155' : '#94A3B8',
                  fontStyle: sprint?.goal ? 'normal' : 'italic',
                  lineHeight: '20px',
                }}
              >
                {sprint?.goal || 'Click to set sprint goal...'}
              </span>
              <Pencil size={12} color="#94A3B8" strokeWidth={2} />
            </div>
          )}
        </div>

        {/* Capacity bar */}
        {capacity && (
          <CapacityBar
            totalPoints={sprintPoints}
            velocity={capacity.team_velocity}
            status={capacity.capacity_status}
          />
        )}
      </div>

      {/* Items */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <DroppablePanel id="sprint" isEmpty={sprintItems.length === 0}>
          {sprintItems.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                border: '2px dashed #CBD5E1',
                borderRadius: 12,
                backgroundColor: '#F8FAFC',
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  color: '#94A3B8',
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                Drag items here
              </p>
            </div>
          ) : (
            <SortableContext
              items={sprintItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sprintItems.map((item) => (
                  <SortablePlanItem
                    key={item.id}
                    item={item}
                    selected={selectedSprint.has(item.id)}
                    onToggleSelect={toggleSelectSprint}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </DroppablePanel>
      </div>

      {/* Footer: Start Sprint button */}
      {sprintItems.length > 0 && sprint?.status === 'planning' && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            icon={<Play size={14} strokeWidth={2} />}
            onClick={handleStartSprint}
            loading={startingSprintLoading}
            disabled={sprintItems.length === 0}
            title={sprintItems.length === 0 ? 'Add items to the sprint first' : undefined}
          >
            Start Sprint
          </Button>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Back navigation */}
      <button
        onClick={() => navigate(`/projects/${projectId}/sprints`)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#2563EB',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Back to Sprints
      </button>

      {/* Page title */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#0F172A',
          margin: '0 0 20px 0',
        }}
      >
        Sprint Planning {sprint ? `- ${sprint.name}` : ''}
      </h1>

      {/* Mobile tabs */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginBottom: 16,
            backgroundColor: '#F1F5F9',
            borderRadius: 10,
            padding: 4,
          }}
        >
          <button
            onClick={() => setMobileTab('available')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: mobileTab === 'available' ? '#FFFFFF' : 'transparent',
              color: mobileTab === 'available' ? '#0F172A' : '#64748B',
              boxShadow:
                mobileTab === 'available' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            Available ({availableItems.length})
          </button>
          <button
            onClick={() => setMobileTab('sprint')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: mobileTab === 'sprint' ? '#FFFFFF' : 'transparent',
              color: mobileTab === 'sprint' ? '#0F172A' : '#64748B',
              boxShadow:
                mobileTab === 'sprint' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            {sprint?.name || 'Sprint'} ({sprintItems.length})
          </button>
        </div>
      )}

      {/* Panels */}
      {isMobile ? (
        // Mobile: tabbed, no DnD
        <div style={{ flex: 1, minHeight: 0 }}>
          {mobileTab === 'available' ? availablePanel : sprintPanel}
        </div>
      ) : (
        // Desktop: two-panel with DnD
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              gap: 20,
              minHeight: 0,
            }}
          >
            {availablePanel}
            {sprintPanel}
          </div>

          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeItem ? <PlanItemOverlay item={activeItem} /> : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}
    </div>
  );
}
