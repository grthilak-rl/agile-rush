import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Play, Calendar } from 'lucide-react';
import { sprintsApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import type { Sprint } from '../types';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SprintsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

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

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  const handleCreate = useCallback(async () => {
    if (!projectId) return;
    setCreating(true);
    try {
      const res = await sprintsApi.create(projectId);
      setSprints((prev) => [...prev, res.data]);
      addToast('success', `${res.data.name} created`);
    } catch {
      addToast('error', 'Failed to create sprint');
    } finally {
      setCreating(false);
    }
  }, [projectId, addToast]);

  const handleStart = useCallback(async (sprint: Sprint) => {
    if (!projectId) return;
    setStartingId(sprint.id);
    try {
      const res = await sprintsApi.start(projectId, sprint.id);
      setSprints((prev) => prev.map((s) => (s.id === sprint.id ? res.data : s)));
      addToast('success', `${sprint.name} started`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to start sprint';
      addToast('error', message);
    } finally {
      setStartingId(null);
    }
  }, [projectId, addToast]);

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <Skeleton width="30%" height={28} style={{ marginBottom: 24 }} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
        ))}
      </div>
    );
  }

  const activeSprints = sprints.filter((s) => s.status === 'active');
  const planningSprints = sprints.filter((s) => s.status === 'planning');
  const completedSprints = sprints.filter((s) => s.status === 'completed');
  const hasActiveSprint = activeSprints.length > 0;

  const renderSprintCard = (sprint: Sprint) => {
    const isActive = sprint.status === 'active';
    const isPlanning = sprint.status === 'planning';

    return (
      <Card key={sprint.id} style={{ marginBottom: 12, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{sprint.name}</span>
              <StatusBadge status={sprint.status} />
            </div>
            {sprint.goal && (
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 6, lineHeight: '20px' }}>
                {sprint.goal}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#94A3B8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} strokeWidth={2} />
                {sprint.duration_weeks} week{sprint.duration_weeks !== 1 ? 's' : ''}
              </span>
              {(sprint.start_date || sprint.end_date) && (
                <span>
                  {formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
            {isActive && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/projects/${projectId}/board`)}
              >
                Go to Board
              </Button>
            )}
            {isPlanning && (
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
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (sprints.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="No sprints yet"
        description="Create your first sprint to start planning work."
        action={{
          label: 'Create Sprint',
          onClick: handleCreate,
        }}
      />
    );
  }

  return (
    <div style={{ padding: '32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>Sprints</h1>
        <Button icon={<Plus size={16} />} onClick={handleCreate} loading={creating} size="sm">
          Create Sprint
        </Button>
      </div>

      {activeSprints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Active
          </h3>
          {activeSprints.map(renderSprintCard)}
        </div>
      )}

      {planningSprints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Planning
          </h3>
          {planningSprints.map(renderSprintCard)}
        </div>
      )}

      {completedSprints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Completed
          </h3>
          {completedSprints.map(renderSprintCard)}
        </div>
      )}
    </div>
  );
}
