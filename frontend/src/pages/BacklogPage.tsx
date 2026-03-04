import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  GripVertical,
  BookOpen,
  ListChecks,
  Bug,
  X,
  Trash2,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  Play,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
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
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { backlogApi, sprintsApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import type { BacklogItem, Sprint, AcceptanceCriteria } from '../types';
import { Button } from '../components/ui/Button';
import { Badge, PriorityBadge } from '../components/ui/Badge';
import { PointsBadge } from '../components/ui/PointsBadge';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SlidePanel } from '../components/ui/SlidePanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { BacklogItemSkeleton } from '../components/ui/Skeleton';

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

const pillStyle = (active: boolean, color: string): React.CSSProperties => ({
  padding: '5px 12px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 150ms ease',
  backgroundColor: active ? `${color}1A` : '#F1F5F9',
  color: active ? color : '#64748B',
});

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

// ---------------------------------------------------------------------------
// Sortable Item Row (needs useSortable hook, so must be its own component)
// ---------------------------------------------------------------------------

function SortableItemRow({
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
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div
        onClick={() => onOpen(item)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#FAFBFC',
          borderRadius: 10,
          borderLeft: `4px solid ${cfg.color}`,
          cursor: 'pointer',
          transition: 'background-color 150ms ease, box-shadow 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FAFBFC';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
        >
          <GripVertical size={16} color="#CBD5E1" />
        </div>

        {/* Type icon */}
        <div
          style={{
            width: 28,
            height: 28,
            minWidth: 28,
            borderRadius: 6,
            backgroundColor: `${cfg.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <TypeIcon size={14} color={cfg.color} strokeWidth={2.5} />
        </div>

        {/* Title + labels */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#0F172A',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.title}
          </div>
          {item.labels.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {item.labels.map((label) => (
                <Badge
                  key={label}
                  label={label}
                  color={hashStringToColor(label)}
                  style={{ fontSize: 10, padding: '1px 6px' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Priority */}
        <PriorityBadge priority={item.priority} />

        {/* Points */}
        <PointsBadge points={item.story_points} size={28} />

        {/* Assignee */}
        {item.assignee ? (
          <Avatar name={item.assignee.full_name} size={28} />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              minWidth: 28,
              borderRadius: '50%',
              border: '1.5px dashed #CBD5E1',
              backgroundColor: '#F8FAFC',
            }}
            title="Unassigned"
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static Item Row (for DragOverlay — no hooks)
// ---------------------------------------------------------------------------

function StaticItemRow({ item }: { item: BacklogItem }) {
  const cfg = TYPE_CONFIG[item.type];
  const TypeIcon = cfg.icon;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderLeft: `4px solid ${cfg.color}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        width: '100%',
      }}
    >
      <GripVertical size={16} color="#CBD5E1" style={{ flexShrink: 0 }} />
      <div
        style={{
          width: 28, height: 28, minWidth: 28, borderRadius: 6,
          backgroundColor: `${cfg.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        <TypeIcon size={14} color={cfg.color} strokeWidth={2.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
        {item.title}
      </div>
      <PriorityBadge priority={item.priority} />
      <PointsBadge points={item.story_points} size={28} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable Section wrapper
// ---------------------------------------------------------------------------

function DroppableSection({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginTop: 8,
        minHeight: 48,
        padding: 4,
        borderRadius: 10,
        border: isOver ? '2px dashed #3B82F6' : '2px dashed transparent',
        backgroundColor: isOver ? '#EFF6FF' : 'transparent',
        transition: 'all 150ms ease',
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Data
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingSprint, setStartingSprint] = useState(false);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Section collapse
  const [sprintCollapsed, setSprintCollapsed] = useState(false);
  const [backlogCollapsed, setBacklogCollapsed] = useState(false);

  // Panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);

  // Panel form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<BacklogItem['type']>('story');
  const [formPriority, setFormPriority] = useState<BacklogItem['priority']>('medium');
  const [formStatus, setFormStatus] = useState<BacklogItem['status']>('backlog');
  const [formPoints, setFormPoints] = useState<number | null>(null);
  const [formCustomPoints, setFormCustomPoints] = useState('');
  const [formSprintId, setFormSprintId] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [formLabels, setFormLabels] = useState<string[]>([]);
  const [formLabelInput, setFormLabelInput] = useState('');
  const [formCriteria, setFormCriteria] = useState<AcceptanceCriteria[]>([]);

  // Auto-save
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Create mode loading
  const [creating, setCreating] = useState(false);

  // Drag & drop
  const [activeId, setActiveId] = useState<string | null>(null);

  // Title input ref
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Track last-saved form snapshot (to skip auto-save when values haven't changed)
  const lastSavedRef = useRef<string>('');

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [itemsRes, sprintsRes, activeRes] = await Promise.all([
        backlogApi.list(projectId),
        sprintsApi.list(projectId),
        sprintsApi.active(projectId),
      ]);
      setItems(itemsRes.data);
      setSprints(sprintsRes.data);
      setActiveSprint(activeRes.data);
    } catch {
      addToast('error', 'Failed to load backlog data');
    } finally {
      setLoading(false);
    }
  }, [projectId, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Start sprint
  // -----------------------------------------------------------------------

  const planningSprint = sprints.find((s) => s.status === 'planning');

  const handleStartSprint = useCallback(async () => {
    if (!projectId) return;
    setStartingSprint(true);
    try {
      let sprint = planningSprint;
      if (!sprint) {
        const createRes = await sprintsApi.create(projectId);
        sprint = createRes.data;
      }
      await sprintsApi.start(projectId, sprint.id);
      addToast('success', `${sprint.name} started`);
      await loadData();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to start sprint';
      addToast('error', message);
    } finally {
      setStartingSprint(false);
    }
  }, [projectId, planningSprint, addToast, loadData]);

  // -----------------------------------------------------------------------
  // Search debounce
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.toLowerCase());
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  // -----------------------------------------------------------------------
  // Filtering
  // -----------------------------------------------------------------------

  const filteredItems = items.filter((item) => {
    // Search
    if (debouncedSearch) {
      const matchesTitle = item.title.toLowerCase().includes(debouncedSearch);
      const matchesLabels = item.labels.some((l) =>
        l.toLowerCase().includes(debouncedSearch)
      );
      if (!matchesTitle && !matchesLabels) return false;
    }
    // Priority
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    // Type
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return true;
  });

  const sprintItems = filteredItems.filter(
    (i) => activeSprint && i.sprint_id === activeSprint.id
  );
  const backlogItems = filteredItems.filter((i) => !i.sprint_id);

  const totalFilteredPoints = filteredItems.reduce(
    (sum, i) => sum + (i.story_points || 0),
    0
  );
  const sprintPoints = sprintItems.reduce(
    (sum, i) => sum + (i.story_points || 0),
    0
  );
  const backlogPoints = backlogItems.reduce(
    (sum, i) => sum + (i.story_points || 0),
    0
  );

  // -----------------------------------------------------------------------
  // Drag & drop
  // -----------------------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeItem = activeId ? items.find((i) => i.id === activeId) ?? null : null;

  function findContainer(itemId: string): 'sprint' | 'backlog' {
    const item = items.find((i) => i.id === itemId);
    if (item && activeSprint && item.sprint_id === activeSprint.id) return 'sprint';
    return 'backlog';
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    // over.id can be a section id ('sprint'/'backlog') or an item id
    let overContainer: 'sprint' | 'backlog';
    if (over.id === 'sprint' || over.id === 'backlog') {
      overContainer = over.id as 'sprint' | 'backlog';
    } else {
      overContainer = findContainer(over.id as string);
    }

    if (activeContainer === overContainer) return;

    // Move item between containers in local state
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== active.id) return item;
        return {
          ...item,
          sprint_id: overContainer === 'sprint' && activeSprint ? activeSprint.id : null,
        };
      })
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !projectId) return;

    const activeContainer = findContainer(active.id as string);
    let overContainer: 'sprint' | 'backlog';
    if (over.id === 'sprint' || over.id === 'backlog') {
      overContainer = over.id as 'sprint' | 'backlog';
    } else {
      overContainer = findContainer(over.id as string);
    }

    const containerItems =
      activeContainer === 'sprint' ? sprintItems : backlogItems;

    // Same container reorder
    if (activeContainer === overContainer && active.id !== over.id) {
      const oldIndex = containerItems.findIndex((i) => i.id === active.id);
      const overIdx = containerItems.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && overIdx !== -1) {
        const reordered = arrayMove(containerItems, oldIndex, overIdx);
        setItems((prev) => {
          const other = prev.filter(
            (i) => !reordered.some((r) => r.id === i.id)
          );
          return [...other, ...reordered];
        });
        // Persist positions
        const reorderPayload = reordered.map((item, idx) => ({
          id: item.id,
          position: idx,
        }));
        backlogApi.reorder(projectId, reorderPayload).catch(() => {
          addToast('error', 'Failed to save order');
        });
        return;
      }
    }

    // Cross-container move — already handled in handleDragOver for local state
    // Now persist to backend
    const movedItem = items.find((i) => i.id === active.id);
    if (!movedItem) return;

    const targetSprintId =
      overContainer === 'sprint' && activeSprint ? activeSprint.id : '';

    // Build reorder payload: the moved item with new sprint_id + position
    const targetItems =
      overContainer === 'sprint' ? sprintItems : backlogItems;
    const reorderPayload = targetItems.map((item, idx) => ({
      id: item.id,
      position: idx,
      ...(item.id === active.id ? { sprint_id: targetSprintId } : {}),
    }));

    // If item wasn't already in the target list (just moved), add it
    if (!targetItems.some((i) => i.id === active.id)) {
      reorderPayload.push({
        id: active.id as string,
        position: targetItems.length,
        sprint_id: targetSprintId,
      });
    }

    backlogApi.reorder(projectId, reorderPayload).catch(() => {
      addToast('error', 'Failed to save order');
    });
  }

  // -----------------------------------------------------------------------
  // Panel helpers
  // -----------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormType('story');
    setFormPriority('medium');
    setFormStatus('backlog');
    setFormPoints(null);
    setFormCustomPoints('');
    setFormSprintId(null);
    setFormDescription('');
    setFormLabels([]);
    setFormLabelInput('');
    setFormCriteria([]);
    setSaveStatus('idle');
  }, []);

  const populateForm = useCallback((item: BacklogItem) => {
    const title = item.title;
    const type = item.type;
    const priority = item.priority;
    const status = item.status;
    const points = item.story_points;
    const sprintId = item.sprint_id;
    const description = item.description || '';
    const labels = [...item.labels];
    const criteria = item.acceptance_criteria.map((c) => ({ ...c }));

    setFormTitle(title);
    setFormType(type);
    setFormPriority(priority);
    setFormStatus(status);
    setFormPoints(points);
    setFormCustomPoints(points !== null ? String(points) : '');
    setFormSprintId(sprintId);
    setFormDescription(description);
    setFormLabels(labels);
    setFormLabelInput('');
    setFormCriteria(criteria);
    setSaveStatus('idle');

    // Pre-set the snapshot so the effect won't treat initial population as a change
    lastSavedRef.current = JSON.stringify({
      formTitle: title, formType: type, formPriority: priority, formStatus: status,
      formPoints: points, formSprintId: sprintId, formDescription: description,
      formLabels: labels, formCriteria: criteria,
    });
  }, []);

  const openCreatePanel = useCallback(() => {
    resetForm();
    setEditingItem(null);
    setPanelMode('create');
    setPanelOpen(true);
    setTimeout(() => titleInputRef.current?.focus(), 100);
  }, [resetForm]);

  const openEditPanel = useCallback(
    (item: BacklogItem) => {
      populateForm(item);
      setEditingItem(item);
      setPanelMode('edit');
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

  // -----------------------------------------------------------------------
  // Auto-save (edit mode)
  // -----------------------------------------------------------------------

  const triggerAutoSave = useCallback(() => {
    if (panelMode !== 'edit' || !editingItem || !projectId) return;

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
        // Update item in the list
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
    panelMode,
    editingItem,
    projectId,
    formTitle,
    formType,
    formPriority,
    formStatus,
    formPoints,
    formSprintId,
    formDescription,
    formLabels,
    formCriteria,
  ]);

  // Trigger auto-save when form fields change (edit mode only)
  useEffect(() => {
    if (panelMode !== 'edit' || !editingItem) return;
    const snapshot = JSON.stringify({
      formTitle, formType, formPriority, formStatus,
      formPoints, formSprintId, formDescription, formLabels, formCriteria,
    });
    if (snapshot === lastSavedRef.current) return;
    lastSavedRef.current = snapshot;
    triggerAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formTitle,
    formType,
    formPriority,
    formStatus,
    formPoints,
    formSprintId,
    formDescription,
    formLabels,
    formCriteria,
  ]);

  // -----------------------------------------------------------------------
  // Create handler
  // -----------------------------------------------------------------------

  const handleCreate = useCallback(async () => {
    if (!projectId || !formTitle.trim()) return;
    setCreating(true);
    try {
      const payload: Partial<BacklogItem> = {
        title: formTitle.trim(),
        type: formType,
        priority: formPriority,
        status: formStatus,
        story_points: formPoints,
        sprint_id: formSprintId,
        description: formDescription || null,
        labels: formLabels,
        acceptance_criteria: formCriteria,
      };
      const res = await backlogApi.create(projectId, payload);
      setItems((prev) => [...prev, res.data]);
      addToast('success', `"${res.data.title}" created`);
      closePanel();
    } catch {
      addToast('error', 'Failed to create item');
    } finally {
      setCreating(false);
    }
  }, [
    projectId,
    formTitle,
    formType,
    formPriority,
    formStatus,
    formPoints,
    formSprintId,
    formDescription,
    formLabels,
    formCriteria,
    addToast,
    closePanel,
  ]);

  // -----------------------------------------------------------------------
  // Delete handler
  // -----------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Label helpers
  // -----------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Acceptance criteria helpers
  // -----------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Render: Section
  // -----------------------------------------------------------------------

  const renderSection = (
    title: string,
    sectionItems: BacklogItem[],
    points: number,
    collapsed: boolean,
    onToggle: () => void,
    variant: 'sprint' | 'backlog'
  ) => {
    const isSprint = variant === 'sprint';

    return (
      <div style={{ marginBottom: 24 }}>
        {/* Section header */}
        <div
          onClick={onToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 4px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          {collapsed ? (
            <ChevronRight size={18} color="#64748B" strokeWidth={2} />
          ) : (
            <ChevronDown size={18} color="#64748B" strokeWidth={2} />
          )}

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              background: isSprint
                ? 'linear-gradient(135deg, #2563EB, #3B82F6)'
                : '#64748B',
              color: '#FFFFFF',
            }}
          >
            {title}
          </span>

          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>
            {sectionItems.length} item{sectionItems.length !== 1 ? 's' : ''} &middot;{' '}
            {points} pts
          </span>
        </div>

        {/* Section items */}
        {!collapsed && (
          <SortableContext
            items={sectionItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <DroppableSection id={variant}>
              {sectionItems.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: 14,
                    backgroundColor: '#FAFBFC',
                    borderRadius: 10,
                    border: '1px dashed #E2E8F0',
                  }}
                >
                  No items {debouncedSearch || priorityFilter !== 'all' || typeFilter !== 'all' ? 'match filters' : 'yet'}
                </div>
              ) : (
                sectionItems.map((item) => (
                  <SortableItemRow
                    key={item.id}
                    item={item}
                    onOpen={openEditPanel}
                  />
                ))
              )}
            </DroppableSection>
          </SortableContext>
        )}
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Render: Item Detail Panel
  // -----------------------------------------------------------------------

  const renderDetailPanel = () => {
    const isEdit = panelMode === 'edit';

    return (
      <SlidePanel isOpen={panelOpen} onClose={closePanel} width={420}>
        {/* Panel Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            flexShrink: 0,
          }}
        >
          {/* Top row: save status + close */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            {/* Save indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 20 }}>
              {isEdit && saveStatus === 'saving' && (
                <>
                  <Loader2
                    size={14}
                    color="#64748B"
                    strokeWidth={2}
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  <span style={{ fontSize: 12, color: '#64748B' }}>Saving...</span>
                </>
              )}
              {isEdit && saveStatus === 'saved' && (
                <>
                  <Check size={14} color="#10B981" strokeWidth={2.5} />
                  <span style={{ fontSize: 12, color: '#10B981', fontWeight: 500 }}>
                    Saved
                  </span>
                </>
              )}
              {isEdit && saveStatus === 'error' && (
                <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>
                  Save failed
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Delete button (edit only) */}
              {isEdit && (
                <button
                  onClick={() => setConfirmOpen(true)}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    color: '#EF4444',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: 'transparent',
                    transition: 'background-color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEF2F2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Delete item"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              )}
              {/* Close */}
              <button
                onClick={closePanel}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  color: '#94A3B8',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: 'transparent',
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: isActive ? `1.5px solid ${cfg.color}` : '1.5px solid transparent',
                    backgroundColor: isActive ? `${cfg.color}15` : '#F8FAFC',
                    color: isActive ? cfg.color : '#94A3B8',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
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
            ref={titleInputRef}
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Item title..."
            style={{
              width: '100%',
              fontSize: 18,
              fontWeight: 600,
              color: '#0F172A',
              border: 'none',
              borderBottom: '2px solid transparent',
              padding: '6px 0',
              outline: 'none',
              backgroundColor: 'transparent',
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = '#2563EB';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = 'transparent';
            }}
          />
        </div>

        {/* Panel Body (scrollable) */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Section: Status & Assignment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label
                style={{
                  width: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#64748B',
                  flexShrink: 0,
                }}
              >
                Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as BacklogItem['status'])}
                style={fieldStyle}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label
                style={{
                  width: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#64748B',
                  flexShrink: 0,
                }}
              >
                Priority
              </label>
              <select
                value={formPriority}
                onChange={(e) =>
                  setFormPriority(e.target.value as BacklogItem['priority'])
                }
                style={fieldStyle}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sprint */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label
                style={{
                  width: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#64748B',
                  flexShrink: 0,
                }}
              >
                Sprint
              </label>
              <select
                value={formSprintId || ''}
                onChange={(e) =>
                  setFormSprintId(e.target.value || null)
                }
                style={fieldStyle}
              >
                <option value="">Unassigned</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Story Points */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <label
                style={{
                  width: 100,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#64748B',
                  flexShrink: 0,
                  paddingTop: 6,
                }}
              >
                Story Points
              </label>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {POINTS_OPTIONS.map((pt) => {
                    const isActive = formPoints === pt;
                    return (
                      <button
                        key={pt}
                        onClick={() => {
                          if (isActive) {
                            setFormPoints(null);
                            setFormCustomPoints('');
                          } else {
                            setFormPoints(pt);
                            setFormCustomPoints(String(pt));
                          }
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          border: isActive ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
                          backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                          color: isActive ? '#2563EB' : '#334155',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {pt}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="number"
                  min={0}
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

          {/* Section: Description */}
          <div style={{ marginTop: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#64748B',
                marginBottom: 6,
              }}
            >
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe this item..."
              style={{
                ...fieldStyle,
                minHeight: 100,
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '20px',
              }}
            />
          </div>

          {/* Section: Labels */}
          <div style={{ marginTop: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#64748B',
                marginBottom: 6,
              }}
            >
              Labels
            </label>
            {formLabels.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  marginBottom: 8,
                }}
              >
                {formLabels.map((label) => (
                  <span
                    key={label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 999,
                      backgroundColor: `${hashStringToColor(label)}1A`,
                      color: hashStringToColor(label),
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                    <button
                      onClick={() => removeLabel(label)}
                      style={{
                        padding: 0,
                        color: 'inherit',
                        cursor: 'pointer',
                        display: 'flex',
                        border: 'none',
                        backgroundColor: 'transparent',
                      }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLabel();
                  }
                }}
                placeholder="Add label..."
                style={{ ...fieldStyle, flex: 1 }}
              />
            </div>
          </div>

          {/* Section: Acceptance Criteria */}
          <div style={{ marginTop: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: '#64748B',
                marginBottom: 6,
              }}
            >
              Acceptance Criteria
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {formCriteria.map((criterion, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() =>
                      updateCriterion(index, { checked: !criterion.checked })
                    }
                    style={{
                      width: 20,
                      height: 20,
                      minWidth: 20,
                      borderRadius: 4,
                      border: criterion.checked
                        ? '2px solid #10B981'
                        : '2px solid #CBD5E1',
                      backgroundColor: criterion.checked ? '#10B981' : '#FFFFFF',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 150ms ease',
                    }}
                  >
                    {criterion.checked && <Check size={12} strokeWidth={3} />}
                  </button>
                  {/* Text input */}
                  <input
                    value={criterion.text}
                    onChange={(e) =>
                      updateCriterion(index, { text: e.target.value })
                    }
                    placeholder="Criterion..."
                    style={{
                      ...fieldStyle,
                      flex: 1,
                      textDecoration: criterion.checked ? 'line-through' : 'none',
                      color: criterion.checked ? '#94A3B8' : '#0F172A',
                    }}
                  />
                  {/* Remove button */}
                  <button
                    onClick={() => removeCriterion(index)}
                    style={{
                      padding: 4,
                      color: '#94A3B8',
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: 'transparent',
                      flexShrink: 0,
                      transition: 'color 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#EF4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#94A3B8';
                    }}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addCriterion}
              style={{
                marginTop: 8,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 500,
                color: '#2563EB',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                transition: 'background-color 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              + Add criterion
            </button>
          </div>

          {/* Progress indicator for acceptance criteria */}
          {formCriteria.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <ProgressBar
                value={
                  (formCriteria.filter((c) => c.checked).length /
                    formCriteria.length) *
                  100
                }
                height={6}
                showLabel
              />
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            flexShrink: 0,
          }}
        >
          {isEdit && editingItem ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#94A3B8',
              }}
            >
              <span>Created: {formatDate(editingItem.created_at)}</span>
              <span>Updated: {formatDate(editingItem.updated_at)}</span>
            </div>
          ) : (
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!formTitle.trim()}
              icon={<Plus size={16} strokeWidth={2} />}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Create
            </Button>
          )}
        </div>
      </SlidePanel>
    );
  };

  // -----------------------------------------------------------------------
  // Main Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        {/* Header skeleton */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 200,
              height: 28,
              backgroundColor: '#E2E8F0',
              borderRadius: 6,
              marginBottom: 8,
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <div
            style={{
              width: 160,
              height: 16,
              backgroundColor: '#E2E8F0',
              borderRadius: 6,
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        </div>
        {/* Filter bar skeleton */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: 40,
              backgroundColor: '#F1F5F9',
              borderRadius: 8,
              marginBottom: 12,
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            {[80, 60, 50, 60, 50].map((w, i) => (
              <div
                key={i}
                style={{
                  width: w,
                  height: 28,
                  backgroundColor: '#F1F5F9',
                  borderRadius: 999,
                  animation: 'pulse 1.5s infinite ease-in-out',
                }}
              />
            ))}
          </div>
        </div>
        {/* Item skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(6)].map((_, i) => (
            <BacklogItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 0' }}>
      {/* ============================================================= */}
      {/* Header                                                         */}
      {/* ============================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: 4,
            }}
          >
            Product Backlog
          </h1>
          <p style={{ fontSize: 14, color: '#64748B' }}>
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} &middot;{' '}
            {totalFilteredPoints} story points
          </p>
        </div>
        <Button
          icon={<Plus size={16} strokeWidth={2} />}
          onClick={openCreatePanel}
        >
          Add Item
        </Button>
      </div>

      {/* ============================================================= */}
      {/* Filter Bar                                                     */}
      {/* ============================================================= */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            marginBottom: 12,
          }}
        >
          <Search size={16} color="#94A3B8" strokeWidth={2} style={{ flexShrink: 0 }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search backlog items..."
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 14,
              color: '#0F172A',
            }}
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setDebouncedSearch('');
              }}
              style={{
                padding: 4,
                color: '#94A3B8',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: 'transparent',
                display: 'flex',
                borderRadius: 4,
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Priority pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <button
            onClick={() => setPriorityFilter('all')}
            style={pillStyle(priorityFilter === 'all', '#334155')}
          >
            All
          </button>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                setPriorityFilter(
                  priorityFilter === opt.value ? 'all' : opt.value
                )
              }
              style={pillStyle(
                priorityFilter === opt.value,
                PRIORITY_COLORS[opt.value]
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Type pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setTypeFilter('all')}
            style={pillStyle(typeFilter === 'all', '#334155')}
          >
            All Types
          </button>
          {(Object.keys(TYPE_CONFIG) as Array<BacklogItem['type']>).map((t) => {
            const cfg = TYPE_CONFIG[t];
            return (
              <button
                key={t}
                onClick={() =>
                  setTypeFilter(typeFilter === t ? 'all' : t)
                }
                style={pillStyle(typeFilter === t, cfg.color)}
              >
                {cfg.emoji} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* Backlog Sections                                               */}
      {/* ============================================================= */}

      {items.length === 0 && !loading ? (
        <EmptyState
          icon="\u{1F4CB}"
          title="No backlog items yet"
          description="Start building your product backlog by adding stories, tasks, and bugs."
          action={{
            label: 'Add Item',
            onClick: openCreatePanel,
            icon: <Plus size={16} strokeWidth={2} />,
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Sprint section — only show if there is an active sprint */}
          {activeSprint &&
            renderSection(
              activeSprint.name,
              sprintItems,
              sprintPoints,
              sprintCollapsed,
              () => setSprintCollapsed((prev) => !prev),
              'sprint'
            )}

          {/* No active sprint banner */}
          {!activeSprint && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                marginBottom: 16,
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 10,
              }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0369A1' }}>
                  No active sprint
                </span>
                <span style={{ fontSize: 13, color: '#0284C7', marginLeft: 8 }}>
                  Start a sprint to move items from backlog to the board.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/projects/${projectId}/sprints`)}
                >
                  Manage Sprints
                </Button>
                <Button
                  size="sm"
                  icon={<Play size={14} />}
                  onClick={handleStartSprint}
                  loading={startingSprint}
                >
                  {planningSprint ? 'Start Sprint' : 'Create & Start Sprint'}
                </Button>
              </div>
            </div>
          )}

          {/* Backlog section */}
          {renderSection(
            'Backlog',
            backlogItems,
            backlogPoints,
            backlogCollapsed,
            () => setBacklogCollapsed((prev) => !prev),
            'backlog'
          )}

          <DragOverlay>
            {activeItem ? <StaticItemRow item={activeItem} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ============================================================= */}
      {/* Item Detail Panel                                              */}
      {/* ============================================================= */}
      {renderDetailPanel()}

      {/* ============================================================= */}
      {/* Confirm Dialog (Delete)                                        */}
      {/* ============================================================= */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete this item?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
