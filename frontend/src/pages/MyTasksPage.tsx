import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Filter, ArrowUpDown } from 'lucide-react';
import { tasksApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { PointsBadge } from '../components/ui/PointsBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import type { MyTaskItem } from '../types';

const priorityColors: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEF2F2', text: '#DC2626' },
  high: { bg: '#FFF7ED', text: '#EA580C' },
  medium: { bg: '#FFFBEB', text: '#D97706' },
  low: { bg: '#F0FDF4', text: '#16A34A' },
};

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const statusColors: Record<string, string> = {
  backlog: '#94A3B8',
  todo: '#64748B',
  in_progress: '#2563EB',
  in_review: '#8B5CF6',
  done: '#10B981',
};

export default function MyTasksPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [items, setItems] = useState<MyTaskItem[]>([]);
  const [summary, setSummary] = useState<{ total: number; by_status: Record<string, number>; total_points: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sort, setSort] = useState('priority');

  useEffect(() => {
    setLoading(true);
    tasksApi.myTasks({ status: statusFilter || undefined, sort })
      .then((res) => {
        setItems(res.data.items);
        setSummary(res.data.summary);
      })
      .catch(() => addToast('error', 'Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [statusFilter, sort, addToast]);

  if (loading) {
    return (
      <div>
        <Skeleton width="30%" height={28} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={16} style={{ marginBottom: 32 }} />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={64} style={{ marginBottom: 8, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckSquare size={24} strokeWidth={2} color="#2563EB" />
          My Tasks
        </h1>
        <p style={{ color: '#64748B', marginTop: 4, fontSize: 15 }}>
          All items assigned to you across projects
        </p>
      </div>

      {/* Summary stats */}
      {summary && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <Card hoverLift={false} style={{ flex: '1 1 140px', padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase' }}>Total</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>{summary.total}</div>
          </Card>
          <Card hoverLift={false} style={{ flex: '1 1 140px', padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#2563EB' }}>{summary.by_status['in_progress'] || 0}</div>
          </Card>
          <Card hoverLift={false} style={{ flex: '1 1 140px', padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase' }}>To Do</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#64748B' }}>{summary.by_status['todo'] || 0}</div>
          </Card>
          <Card hoverLift={false} style={{ flex: '1 1 140px', padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', textTransform: 'uppercase' }}>Points</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6' }}>{summary.total_points}</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} strokeWidth={2} color="#94A3B8" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #E2E8F0',
              fontSize: 13,
              color: '#334155',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              appearance: 'auto' as const,
            }}
          >
            <option value="">All statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="todo">To Do</option>
            <option value="in_review">In Review</option>
            <option value="backlog">Backlog</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowUpDown size={14} strokeWidth={2} color="#94A3B8" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #E2E8F0',
              fontSize: 13,
              color: '#334155',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              appearance: 'auto' as const,
            }}
          >
            <option value="priority">Priority</option>
            <option value="recent">Recently Updated</option>
            <option value="points">Story Points</option>
          </select>
        </div>
      </div>

      {/* Task list */}
      {items.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={48} strokeWidth={1.5} color="#CBD5E1" />}
          title="No tasks assigned"
          description={statusFilter ? 'No tasks match the selected filter' : 'You have no items assigned to you'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item) => {
            const pColor = priorityColors[item.priority] || priorityColors.medium;
            return (
              <Card
                key={item.id}
                hoverLift={false}
                style={{ padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => navigate(`/projects/${item.project_id}/backlog`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: 4,
                      height: 32,
                      borderRadius: 2,
                      backgroundColor: item.project_color,
                      flexShrink: 0,
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>{item.project_name}</span>
                        {item.sprint_name && (
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>{item.sprint_name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 4,
                      backgroundColor: pColor.bg,
                      color: pColor.text,
                      textTransform: 'capitalize',
                    }}>
                      {item.priority}
                    </span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 4,
                      color: statusColors[item.status] || '#64748B',
                      backgroundColor: `${statusColors[item.status] || '#64748B'}15`,
                    }}>
                      {statusLabels[item.status] || item.status}
                    </span>
                    {item.story_points != null && <PointsBadge points={item.story_points} />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
