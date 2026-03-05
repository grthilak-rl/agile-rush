import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { sprintsApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import type { SprintSummary } from '../types';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getCompletionColor(rate: number): string {
  if (rate >= 80) return '#10B981';
  if (rate >= 60) return '#F97316';
  return '#F43F5E';
}

export default function SprintSummaryPage() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [summary, setSummary] = useState<SprintSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!projectId || !sprintId) return;
    setLoading(true);
    try {
      const res = await sprintsApi.summary(projectId, sprintId);
      setSummary(res.data);
    } catch {
      addToast('error', 'Failed to load sprint summary');
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintId, addToast]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        {/* Header skeleton */}
        <Skeleton width="40%" height={28} style={{ marginBottom: 12 }} />
        <Skeleton width="25%" height={16} style={{ marginBottom: 24 }} />

        {/* Stat cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <Skeleton width="50%" height={14} style={{ marginBottom: 12, marginLeft: 'auto', marginRight: 'auto' }} />
              <Skeleton width="30%" height={32} style={{ marginBottom: 8, marginLeft: 'auto', marginRight: 'auto' }} />
              <Skeleton width="40%" height={12} style={{ marginLeft: 'auto', marginRight: 'auto' }} />
            </div>
          ))}
        </div>

        {/* Progress skeleton */}
        <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 24 }} />

        {/* List skeletons */}
        <Skeleton width="30%" height={20} style={{ marginBottom: 12 }} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={48} borderRadius={8} style={{ marginBottom: 8 }} />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: '#64748B' }}>No summary data available.</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/sprints`)}
          style={{ marginTop: 16 }}
        >
          Back to Sprints
        </Button>
      </div>
    );
  }

  const { sprint, completion_rate, velocity, items_completed, items_total, planned_points, completed_points, items_added_mid_sprint, completed_items, incomplete_items } = summary;

  const dateRangeYear = sprint.end_date
    ? new Date(sprint.end_date).toLocaleDateString('en-US', { year: 'numeric' })
    : '';
  const dateRange = sprint.start_date && sprint.end_date
    ? `${formatDateShort(sprint.start_date)} - ${formatDateShort(sprint.end_date)}, ${dateRangeYear}`
    : formatDate(sprint.start_date);

  const completionColor = getCompletionColor(completion_rate);

  return (
    <div style={{ padding: '32px 0', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => navigate(`/projects/${projectId}/sprints`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#2563EB',
            fontSize: 13,
            fontWeight: 600,
            padding: 0,
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Back to Sprints
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>
          {sprint.name} Summary
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#64748B', marginBottom: 8 }}>
          <span>{dateRange}</span>
          <span style={{ color: '#94A3B8' }}>|</span>
          <span>{summary.duration_days} days</span>
        </div>

        {sprint.goal && (
          <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: '22px' }}>
            {sprint.goal}
          </p>
        )}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {/* Completion Rate */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
            Completion Rate
          </p>
          <p style={{ fontSize: 32, fontWeight: 700, color: completionColor, margin: '0 0 4px 0' }}>
            {Math.round(completion_rate)}%
          </p>
          <div
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: completionColor,
            }}
          />
        </div>

        {/* Velocity */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
            Velocity
          </p>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#2563EB', margin: '0 0 4px 0' }}>
            {velocity}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>story points</p>
        </div>

        {/* Items */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
            Items
          </p>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
            {items_completed}/{items_total}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>completed</p>
        </div>
      </div>

      {/* Progress Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
            Planned: {planned_points} pts - Completed: {completed_points} pts
          </span>
        </div>

        {items_added_mid_sprint > 0 && (
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px 0' }}>
            Items added mid-sprint: {items_added_mid_sprint}
          </p>
        )}
        {items_added_mid_sprint === 0 && (
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 12px 0' }}>
            Items added mid-sprint: 0
          </p>
        )}

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: 10,
            backgroundColor: '#E2E8F0',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, completion_rate))}%`,
              height: '100%',
              backgroundColor: completionColor,
              borderRadius: 999,
              transition: 'width 400ms ease',
            }}
          />
        </div>
      </div>

      {/* Completed Items */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 14px 0' }}>
          Completed Items
        </h2>
        {completed_items.length === 0 ? (
          <p style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>No items completed.</p>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            {completed_items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: index < completed_items.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}
              >
                <Check size={16} strokeWidth={2.5} color="#10B981" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
                  {item.title}
                </span>
                {item.story_points !== null && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      fontSize: 12,
                      fontWeight: 700,
                      border: '1.5px solid #BFDBFE',
                      flexShrink: 0,
                    }}
                  >
                    {item.story_points}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incomplete Items */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 14px 0' }}>
          Incomplete Items
        </h2>
        {incomplete_items.length === 0 ? (
          <p style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>All items completed!</p>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFBEB',
              borderRadius: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #FDE68A',
              overflow: 'hidden',
            }}
          >
            {incomplete_items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: index < incomplete_items.length - 1 ? '1px solid #FDE68A' : 'none',
                }}
              >
                <AlertTriangle size={16} strokeWidth={2.5} color="#F97316" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
                  {item.title}
                </span>
                {item.story_points !== null && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      minWidth: 28,
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      fontSize: 12,
                      fontWeight: 700,
                      border: '1.5px solid #BFDBFE',
                      flexShrink: 0,
                    }}
                  >
                    {item.story_points}
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, flexShrink: 0 }}>
                  -&gt; Backlog
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 8 }}>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate(`/projects/${projectId}/sprints/${sprintId}/retro`)}
        >
          View Retrospective
        </Button>
        <button
          onClick={() => navigate(`/projects/${projectId}/sprints`)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#2563EB',
            fontSize: 14,
            fontWeight: 600,
            padding: 0,
          }}
        >
          Back to Sprints
        </button>
      </div>
    </div>
  );
}
