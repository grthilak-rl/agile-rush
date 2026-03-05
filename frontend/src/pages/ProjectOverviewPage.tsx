import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Zap,
} from 'lucide-react';
import { projectsApi, sprintsApi, activityApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import type { Project, Sprint, ActivityLog, ProjectStats } from '../types';
import { Card } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton } from '../components/ui/Skeleton';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const projectTypeColors: Record<string, string> = {
  contract: '#2563EB',
  full_time: '#8B5CF6',
  one_off: '#F97316',
};

export default function ProjectOverviewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingSprintAction, setCreatingSprintAction] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    Promise.all([
      projectsApi.get(projectId),
      sprintsApi.active(projectId),
      sprintsApi.list(projectId),
      projectsApi.stats(projectId),
      activityApi.list(projectId, { limit: 20 }),
    ])
      .then(([projectRes, sprintRes, sprintsRes, statsRes, activityRes]) => {
        setProject(projectRes.data);
        setActiveSprint(sprintRes.data);
        setSprints(sprintsRes.data);
        setStats(statsRes.data);
        setActivities(activityRes.data);
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 403) {
          setError('You don\'t have access to this project.');
        } else if (status === 404) {
          setError('Project not found.');
        } else {
          setError('Failed to load project data. Please try again.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId]);

  if (loading) {
    return (
      <div>
        {/* Back link skeleton */}
        <Skeleton width={140} height={16} style={{ marginBottom: 20 }} />

        {/* Header skeleton */}
        <Skeleton width="40%" height={32} style={{ marginBottom: 8 }} />
        <Skeleton width="20%" height={16} style={{ marginBottom: 24 }} />

        {/* Sprint banner skeleton */}
        <Skeleton
          width="100%"
          height={200}
          borderRadius={16}
          style={{ marginBottom: 24 }}
        />

        {/* Stat cards skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <Skeleton width={40} height={40} borderRadius={10} style={{ marginBottom: 12 }} />
              <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="30%" height={24} />
            </div>
          ))}
        </div>

        {/* Two-column skeleton */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <Skeleton width="40%" height={20} style={{ marginBottom: 20 }} />
            <Skeleton height={120} />
          </div>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <Skeleton width="30%" height={20} style={{ marginBottom: 20 }} />
            <Skeleton height={120} />
          </div>
        </div>

        {/* Activity skeleton */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <Skeleton width="30%" height={20} style={{ marginBottom: 16 }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <Skeleton width="60%" height={14} />
              <div style={{ marginLeft: 'auto' }}>
                <Skeleton width={60} height={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !project || !stats) {
    return (
      <div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#2563EB',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 20,
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Back to Projects
        </button>
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: '#64748B',
          }}
        >
          <AlertTriangle size={48} color="#F59E0B" strokeWidth={1.5} style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#334155', marginBottom: 8 }}>
            {error || 'Project not found'}
          </h2>
          <p>Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  const daysRemaining = activeSprint?.end_date
    ? Math.max(0, Math.ceil(
        (new Date(activeSprint.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : null;

  const completionPct = Math.round((stats.completed / stats.total_items) * 100) || 0;

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#2563EB',
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 20,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Back to Projects
      </button>

      {/* Project Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1>{project.name}</h1>
            <Badge
              label={project.project_type.replace(/_/g, ' ')}
              color={projectTypeColors[project.project_type] || '#94A3B8'}
            />
          </div>
          {project.client_name && (
            <p style={{ color: '#64748B', fontSize: 15 }}>{project.client_name}</p>
          )}
        </div>
        <button
          onClick={() => navigate(`/projects/${projectId}/board`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1D4ED8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
        >
          Go to Board
        </button>
      </div>

      {/* Active Sprint Banner */}
      {activeSprint ? (
        <div
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: 16,
            padding: 28,
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
            color: '#FFFFFF',
          }}
        >
          {/* Decorative circles */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(37, 99, 235, 0.15)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              right: 80,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.1)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ color: '#FFFFFF' }}>{activeSprint.name}</h2>
              <StatusBadge status="active" />
            </div>
            {activeSprint.goal && (
              <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>
                {activeSprint.goal}
              </p>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#94A3B8',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Calendar size={14} strokeWidth={1.75} />
                  Days Remaining
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {daysRemaining !== null ? daysRemaining : '\u2014'}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#94A3B8',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Target size={14} strokeWidth={1.75} />
                  Completion
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{completionPct}%</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#94A3B8',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <TrendingUp size={14} strokeWidth={1.75} />
                  Story Points
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {stats.completed_points}
                  <span style={{ fontSize: 16, fontWeight: 400, color: '#94A3B8' }}>
                    /{stats.total_points}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <ProgressBar value={completionPct} height={10} />
            </div>
          </div>
        </div>
      ) : (
        <Card hoverLift={false} style={{ marginBottom: 24, textAlign: 'center', padding: 32 }}>
          <AlertTriangle
            size={32}
            color="#F59E0B"
            strokeWidth={1.5}
            style={{ marginBottom: 12 }}
          />
          <h3 style={{ color: '#334155', marginBottom: 8 }}>No active sprint</h3>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>
            {sprints.some((s) => s.status === 'planning')
              ? 'You have a sprint ready to start.'
              : 'Create a sprint to start tracking progress for this project.'}
          </p>
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: creatingSprintAction ? 'not-allowed' : 'pointer',
              opacity: creatingSprintAction ? 0.6 : 1,
              transition: 'all 150ms ease',
            }}
            disabled={creatingSprintAction}
            onClick={async () => {
              if (!projectId) return;
              setCreatingSprintAction(true);
              try {
                const planningSprint = sprints.find((s) => s.status === 'planning');
                if (planningSprint) {
                  await sprintsApi.start(projectId, planningSprint.id);
                  addToast('success', `${planningSprint.name} started`);
                } else {
                  const createRes = await sprintsApi.create(projectId);
                  await sprintsApi.start(projectId, createRes.data.id);
                  addToast('success', `${createRes.data.name} created and started`);
                }
                navigate(`/projects/${projectId}/board`);
              } catch {
                addToast('error', 'Failed to start sprint');
              } finally {
                setCreatingSprintAction(false);
              }
            }}
          >
            {creatingSprintAction
              ? 'Starting...'
              : sprints.some((s) => s.status === 'planning')
                ? 'Start Sprint'
                : 'Create & Start Sprint'}
          </button>
        </Card>
      )}

      {/* Sprint Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          { label: 'To Do', value: String(stats.new_items), icon: Clock, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'In Progress', value: String(stats.in_progress), icon: TrendingUp, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Completed', value: String(stats.completed), icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
          {
            label: 'Story Points',
            value: `${stats.completed_points}/${stats.total_points}`,
            icon: Zap,
            color: '#8B5CF6',
            bg: '#F5F3FF',
          },
        ].map((stat) => (
          <Card key={stat.label} style={{ borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: stat.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <stat.icon size={20} color={stat.color} strokeWidth={1.75} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{stat.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>{stat.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Two-column grid: Velocity Chart + Team */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Velocity Chart */}
        <Card hoverLift={false}>
          <h3 style={{ marginBottom: 20 }}>Sprint Velocity</h3>
          {stats.total_points > 0 ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 70,
                      fontSize: 12,
                      color: '#64748B',
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    Current
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          height: 12,
                          width: '100%',
                          backgroundColor: '#E2E8F0',
                          borderRadius: 999,
                          minWidth: 4,
                        }}
                      />
                      <span style={{ fontSize: 11, color: '#94A3B8', minWidth: 20 }}>
                        {stats.total_points}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          height: 12,
                          width: stats.total_points > 0
                            ? `${(stats.completed_points / stats.total_points) * 100}%`
                            : '0%',
                          background: 'linear-gradient(90deg, #2563EB, #8B5CF6)',
                          borderRadius: 999,
                          minWidth: 4,
                        }}
                      />
                      <span
                        style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, minWidth: 20 }}
                      >
                        {stats.completed_points}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#E2E8F0' }}
                  />
                  <span style={{ color: '#64748B' }}>Planned</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: 'linear-gradient(90deg, #2563EB, #8B5CF6)',
                    }}
                  />
                  <span style={{ color: '#64748B' }}>Completed</span>
                </div>
              </div>
              <p
                style={{
                  color: '#94A3B8',
                  fontSize: 12,
                  marginTop: 12,
                  fontStyle: 'italic',
                }}
              >
                Velocity data available after multiple sprints
              </p>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 120,
                color: '#94A3B8',
                fontSize: 14,
              }}
            >
              Velocity data available after multiple sprints
            </div>
          )}
        </Card>

        {/* Team Panel */}
        <Card hoverLift={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Users size={18} color="#64748B" strokeWidth={1.75} />
            <h3>Team</h3>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
              padding: 24,
              borderRadius: 10,
              backgroundColor: '#F8FAFC',
              border: '1px dashed #CBD5E1',
            }}
          >
            <Users size={32} color="#94A3B8" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748B', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              Team management coming soon
            </p>
            <p style={{ color: '#94A3B8', fontSize: 12 }}>
              Invite and manage team members for this project.
            </p>
          </div>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card hoverLift={false}>
        <h3 style={{ marginBottom: 16 }}>Recent Activity</h3>
        {activities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activities.map((activity, i) => {
              const itemTitle =
                (activity.details as Record<string, unknown>)?.item_title as string | undefined;
              const targetLabel = itemTitle || activity.entity_type.replace(/_/g, ' ');

              return (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom:
                      i < activities.length - 1 ? '1px solid #F1F5F9' : undefined,
                  }}
                >
                  <Avatar name={activity.user.full_name} size={32} />
                  <div style={{ flex: 1, fontSize: 14 }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                      {activity.user.full_name}
                    </span>{' '}
                    <span style={{ color: '#64748B' }}>{activity.action}</span>{' '}
                    <span style={{ fontWeight: 500, color: '#334155' }}>{targetLabel}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {timeAgo(activity.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 80,
              color: '#94A3B8',
              fontSize: 14,
            }}
          >
            No activity yet
          </div>
        )}
      </Card>
    </div>
  );
}
