import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Plus,
  Play,
  Calendar,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  LayoutDashboard,
  CheckCircle2,
  FileText,
  MessageSquare,
  Target,
  ClipboardList,
} from 'lucide-react';
import { sprintsApi, backlogApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import type { Sprint, BacklogItem } from '../types';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProgressBar } from '../components/ui/ProgressBar';


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  fontSize: 14,
  backgroundColor: '#FFFFFF',
  color: '#0F172A',
  transition: 'border-color 150ms ease',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SprintStats {
  totalItems: number;
  completedItems: number;
  totalPoints: number;
  completedPoints: number;
}

interface SprintFormData {
  name: string;
  goal: string;
  duration_weeks: number;
  start_date: string;
}

// ---------------------------------------------------------------------------
// SprintsPage
// ---------------------------------------------------------------------------

export default function SprintsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  // -------------------------------------------------------------------------
  // Data state
  // -------------------------------------------------------------------------
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [sprintStats, setSprintStats] = useState<Record<string, SprintStats>>({});

  // -------------------------------------------------------------------------
  // Collapsible sections
  // -------------------------------------------------------------------------
  const [isPlanningCollapsed, setIsPlanningCollapsed] = useState(false);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);

  // -------------------------------------------------------------------------
  // Create / Edit modal state
  // -------------------------------------------------------------------------
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [formData, setFormData] = useState<SprintFormData>({
    name: '',
    goal: '',
    duration_weeks: 2,
    start_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Delete confirm state
  // -------------------------------------------------------------------------
  const [deleteTarget, setDeleteTarget] = useState<Sprint | null>(null);
  const [deleting, setDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Action loading state
  // -------------------------------------------------------------------------
  const [startingId, setStartingId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------
  const loadSprints = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await sprintsApi.list(projectId);
      setSprints(res.data);
    } catch {
      addToast('error', 'Failed to load sprints');
    } finally {
      setLoading(false);
    }
  }, [projectId, addToast]);

  const loadSprintStats = useCallback(async (sprintList: Sprint[]) => {
    if (!projectId) return;
    const stats: Record<string, SprintStats> = {};
    await Promise.all(
      sprintList.map(async (sprint) => {
        try {
          const res = await backlogApi.list(projectId, { sprint_id: sprint.id });
          const items: BacklogItem[] = res.data;
          stats[sprint.id] = {
            totalItems: items.length,
            completedItems: items.filter((i) => i.status === 'done').length,
            totalPoints: items.reduce((sum, i) => sum + (i.story_points || 0), 0),
            completedPoints: items
              .filter((i) => i.status === 'done')
              .reduce((sum, i) => sum + (i.story_points || 0), 0),
          };
        } catch {
          stats[sprint.id] = { totalItems: 0, completedItems: 0, totalPoints: 0, completedPoints: 0 };
        }
      })
    );
    setSprintStats(stats);
  }, [projectId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  useEffect(() => {
    if (sprints.length > 0) {
      loadSprintStats(sprints);
    }
  }, [sprints, loadSprintStats]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const activeSprints = sprints.filter((s) => s.status === 'active');
  const planningSprints = sprints.filter((s) => s.status === 'planning');
  const completedSprints = sprints.filter((s) => s.status === 'completed');
  const hasActiveSprint = activeSprints.length > 0;

  // -------------------------------------------------------------------------
  // Create modal helpers
  // -------------------------------------------------------------------------
  const getNextSprintNumber = useCallback(() => {
    if (sprints.length === 0) return 1;
    const maxNumber = Math.max(...sprints.map((s) => s.sprint_number));
    return maxNumber + 1;
  }, [sprints]);

  const openCreateModal = useCallback(() => {
    const nextNum = getNextSprintNumber();
    setFormData({
      name: `Sprint ${nextNum}`,
      goal: '',
      duration_weeks: 2,
      start_date: '',
    });
    setEditingSprint(null);
    setShowCreateModal(true);
  }, [getNextSprintNumber]);

  const openEditModal = useCallback((sprint: Sprint) => {
    setFormData({
      name: sprint.name,
      goal: sprint.goal || '',
      duration_weeks: sprint.duration_weeks,
      start_date: sprint.start_date || '',
    });
    setEditingSprint(sprint);
    setShowCreateModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowCreateModal(false);
    setEditingSprint(null);
  }, []);

  // -------------------------------------------------------------------------
  // Form handlers
  // -------------------------------------------------------------------------
  const handleSubmit = useCallback(async () => {
    if (!projectId) return;
    setSubmitting(true);
    try {
      if (editingSprint) {
        const updateData: Partial<Sprint> = {
          name: formData.name.trim(),
          goal: formData.goal.trim() || null,
          duration_weeks: formData.duration_weeks,
        };
        const res = await sprintsApi.update(projectId, editingSprint.id, updateData);
        setSprints((prev) => prev.map((s) => (s.id === editingSprint.id ? res.data : s)));
        addToast('success', `${res.data.name} updated`);
      } else {
        const createData: { name?: string; goal?: string; duration_weeks?: number } = {
          name: formData.name.trim(),
          duration_weeks: formData.duration_weeks,
        };
        if (formData.goal.trim()) {
          createData.goal = formData.goal.trim();
        }
        const res = await sprintsApi.create(projectId, createData);
        setSprints((prev) => [...prev, res.data]);
        addToast('success', `${res.data.name} created`);
      }
      closeModal();
    } catch {
      addToast('error', editingSprint ? 'Failed to update sprint' : 'Failed to create sprint');
    } finally {
      setSubmitting(false);
    }
  }, [projectId, formData, editingSprint, addToast, closeModal]);

  // -------------------------------------------------------------------------
  // Start sprint
  // -------------------------------------------------------------------------
  const handleStart = useCallback(async (sprint: Sprint) => {
    if (!projectId) return;
    setStartingId(sprint.id);
    try {
      const res = await sprintsApi.start(projectId, sprint.id);
      setSprints((prev) => prev.map((s) => (s.id === sprint.id ? res.data : s)));
      addToast('success', `${sprint.name} started`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to start sprint';
      addToast('error', message);
    } finally {
      setStartingId(null);
    }
  }, [projectId, addToast]);

  // -------------------------------------------------------------------------
  // Delete sprint
  // -------------------------------------------------------------------------
  const handleDelete = useCallback(async () => {
    if (!projectId || !deleteTarget) return;
    setDeleting(true);
    try {
      await sprintsApi.delete(projectId, deleteTarget.id);
      setSprints((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      addToast('success', `${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch {
      addToast('error', 'Failed to delete sprint');
    } finally {
      setDeleting(false);
    }
  }, [projectId, deleteTarget, addToast]);

  // -------------------------------------------------------------------------
  // Render: Create / Edit Modal
  // -------------------------------------------------------------------------
  const renderModal = () => {
    if (!showCreateModal) return null;

    const isEditing = !!editingSprint;
    const title = isEditing ? `Edit ${editingSprint!.name}` : 'Create Sprint';
    const submitLabel = isEditing ? 'Save Changes' : 'Create Sprint';

    const content = (
      <>
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            pointerEvents: 'auto',
            animation: 'fadeIn 150ms ease forwards',
          }}
        />
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            width: 480,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            zIndex: 1001,
            pointerEvents: 'auto',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            animation: 'fadeIn 200ms ease forwards',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>
            {title}
          </h3>

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Sprint name"
              style={fieldStyle}
            />
          </div>

          {/* Goal */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Goal</label>
            <textarea
              value={formData.goal}
              onChange={(e) => setFormData((prev) => ({ ...prev, goal: e.target.value }))}
              placeholder="What do you want to achieve in this sprint?"
              rows={3}
              style={{
                ...fieldStyle,
                resize: 'vertical',
                minHeight: 72,
              }}
            />
          </div>

          {/* Duration */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Duration</label>
            <select
              value={formData.duration_weeks}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, duration_weeks: Number(e.target.value) }))
              }
              style={fieldStyle}
            >
              <option value={1}>1 week</option>
              <option value={2}>2 weeks</option>
              <option value={3}>3 weeks</option>
              <option value={4}>4 weeks</option>
            </select>
          </div>

          {/* Start Date (only for create) */}
          {!isEditing && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Start Date (optional)</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                style={fieldStyle}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!formData.name.trim()}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </>
    );

    return createPortal(content, document.body);
  };

  // -------------------------------------------------------------------------
  // Render: Section header (collapsible)
  // -------------------------------------------------------------------------
  const renderSectionHeader = (
    label: string,
    count: number,
    collapsed: boolean,
    onToggle: () => void,
    color: string,
  ) => {
    const ChevronIcon = collapsed ? ChevronRight : ChevronDown;
    return (
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: collapsed ? 0 : 10,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <ChevronIcon size={16} color={color} strokeWidth={2.5} />
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: color,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          {label}
        </h3>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#94A3B8',
            backgroundColor: '#F1F5F9',
            borderRadius: 999,
            padding: '1px 8px',
          }}
        >
          {count}
        </span>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Render: Sprint card
  // -------------------------------------------------------------------------
  const renderSprintCard = (sprint: Sprint) => {
    const isActive = sprint.status === 'active';
    const isPlanning = sprint.status === 'planning';
    const isCompleted = sprint.status === 'completed';

    const stats = sprintStats[sprint.id] || {
      totalItems: 0,
      completedItems: 0,
      totalPoints: 0,
      completedPoints: 0,
    };

    const progressPercent =
      stats.totalPoints > 0
        ? Math.round((stats.completedPoints / stats.totalPoints) * 100)
        : stats.totalItems > 0
          ? Math.round((stats.completedItems / stats.totalItems) * 100)
          : 0;

    // Card style varies by status
    let borderLeftColor: string | undefined;
    let cardBg: string | undefined;
    let cardBorder: string | undefined;
    let cardOpacity: number | undefined;

    if (isActive) {
      borderLeftColor = '#2563EB';
      cardBg = '#F8FBFF';
    } else if (isPlanning) {
      borderLeftColor = '#F97316';
      cardBorder = '1px dashed #E2E8F0';
    } else if (isCompleted) {
      borderLeftColor = '#10B981';
      cardOpacity = 0.9;
    }

    // Date display
    let dateDisplay = 'Not started';
    if (sprint.start_date && sprint.end_date) {
      dateDisplay = `${formatDate(sprint.start_date)} - ${formatDate(sprint.end_date)}`;
    } else if (sprint.start_date) {
      dateDisplay = `Started ${formatDate(sprint.start_date)}`;
    }

    return (
      <Card
        key={sprint.id}
        borderLeft={borderLeftColor}
        hoverLift={!isCompleted}
        style={{
          marginBottom: 12,
          borderRadius: 12,
          backgroundColor: cardBg,
          border: cardBorder,
          opacity: cardOpacity,
        }}
      >
        {/* Top row: name + badge + actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>
                {sprint.name}
              </span>
              <StatusBadge status={sprint.status} />
            </div>

            {/* Date range */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: '#94A3B8',
                marginBottom: sprint.goal ? 8 : 0,
              }}
            >
              <Calendar size={12} strokeWidth={2} />
              <span>
                {dateDisplay}
                {' -- '}
                {sprint.duration_weeks} week{sprint.duration_weeks !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Goal */}
            {sprint.goal && (
              <p
                style={{
                  fontSize: 13,
                  color: '#64748B',
                  lineHeight: '20px',
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                {sprint.goal}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            {isPlanning && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ClipboardList size={14} />}
                  onClick={() => navigate(`/projects/${projectId}/sprints/${sprint.id}/plan`)}
                >
                  Plan Sprint
                </Button>
                <Button
                  size="sm"
                  icon={<Play size={14} />}
                  onClick={() => handleStart(sprint)}
                  loading={startingId === sprint.id}
                  disabled={hasActiveSprint}
                  title={hasActiveSprint ? 'Complete the active sprint first' : undefined}
                >
                  Start Sprint
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil size={14} />}
                  onClick={() => openEditModal(sprint)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => setDeleteTarget(sprint)}
                  style={{ color: '#F43F5E' }}
                >
                  Delete
                </Button>
              </>
            )}

            {isActive && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<LayoutDashboard size={14} />}
                  onClick={() => navigate(`/projects/${projectId}/board`)}
                >
                  Go to Board
                </Button>
                <Button
                  size="sm"
                  icon={<CheckCircle2 size={14} />}
                  onClick={() => navigate(`/projects/${projectId}/board`)}
                >
                  Complete Sprint
                </Button>
                {(sprintStats[sprint.id]?.totalItems ?? 0) === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => setDeleteTarget(sprint)}
                    style={{ color: '#F43F5E' }}
                  >
                    Delete
                  </Button>
                )}
              </>
            )}

            {isCompleted && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FileText size={14} />}
                  onClick={() =>
                    navigate(`/projects/${projectId}/sprints/${sprint.id}/summary`)
                  }
                >
                  View Summary
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<MessageSquare size={14} />}
                  onClick={() =>
                    navigate(`/projects/${projectId}/sprints/${sprint.id}/retro`)
                  }
                >
                  View Retro
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress bar + stats */}
        {stats.totalItems > 0 && (
          <div style={{ marginTop: 14 }}>
            <ProgressBar
              value={progressPercent}
              height={6}
              showLabel={false}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 6,
                fontSize: 12,
                color: '#64748B',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Target size={12} strokeWidth={2} />
                {stats.completedItems}/{stats.totalItems} items
              </span>
              {stats.totalPoints > 0 && (
                <span>
                  {stats.completedPoints}/{stats.totalPoints} points
                </span>
              )}
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {progressPercent}%
              </span>
            </div>
          </div>
        )}
      </Card>
    );
  };

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <Skeleton width="30%" height={28} style={{ marginBottom: 24 }} />
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            width="100%"
            height={120}
            borderRadius={12}
            style={{ marginBottom: 12 }}
          />
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  if (sprints.length === 0) {
    return (
      <>
        <EmptyState
          title="No sprints yet"
          description="Create your first sprint to start planning and organizing your work into iterations."
          action={{
            label: 'Create Sprint',
            onClick: openCreateModal,
            icon: <Plus size={16} />,
          }}
        />
        {renderModal()}
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------
  return (
    <div style={{ padding: '32px 0' }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>Sprints</h1>
        <Button icon={<Plus size={16} />} onClick={openCreateModal} size="sm">
          Create Sprint
        </Button>
      </div>

      {/* Active sprints section */}
      {activeSprints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#2563EB',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 10,
            }}
          >
            Active
          </h3>
          {activeSprints.map(renderSprintCard)}
        </div>
      )}

      {/* Planning sprints section (collapsible) */}
      {planningSprints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {renderSectionHeader(
            'Planning',
            planningSprints.length,
            isPlanningCollapsed,
            () => setIsPlanningCollapsed((prev) => !prev),
            '#F97316',
          )}
          {!isPlanningCollapsed && (
            <div style={{ marginTop: 10 }}>
              {planningSprints.map(renderSprintCard)}
            </div>
          )}
        </div>
      )}

      {/* Completed sprints section (collapsible, default collapsed) */}
      {completedSprints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {renderSectionHeader(
            'Completed',
            completedSprints.length,
            isCompletedCollapsed,
            () => setIsCompletedCollapsed((prev) => !prev),
            '#10B981',
          )}
          {!isCompletedCollapsed && (
            <div style={{ marginTop: 10 }}>
              {completedSprints.map(renderSprintCard)}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      {renderModal()}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.name}?`}
        message="All items assigned to this sprint will be moved back to the backlog. This action cannot be undone."
        confirmLabel="Delete Sprint"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
