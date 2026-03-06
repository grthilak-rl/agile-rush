import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  IterationCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import { projectsApi, dashboardApi, backlogApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import type { Project, DashboardStats, BacklogItem } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { SlidePanel } from '../components/ui/SlidePanel';

const projectTypeColors: Record<string, string> = {
  contract: '#2563EB',
  full_time: '#8B5CF6',
  one_off: '#F97316',
};

const projectTypeLabels: Record<string, string> = {
  contract: 'Contract',
  full_time: 'Full-Time',
  one_off: 'One-Off',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
  transition: 'border-color 150ms ease',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#334155',
  marginBottom: 6,
};

function getGreeting(fullName: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${fullName}`;
  if (hour < 17) return `Good afternoon, ${fullName}`;
  return `Good evening, ${fullName}`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingItems, setUpcomingItems] = useState<BacklogItem[]>([]);

  // Slide panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('contract');
  const [formDuration, setFormDuration] = useState(2);

  // Fetch projects and stats on mount
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [projectsRes, statsRes] = await Promise.all([
          projectsApi.list(),
          dashboardApi.stats().catch(() => null),
        ]);
        if (!cancelled) {
          setProjects(projectsRes.data);
          if (statsRes) setStats(statsRes.data);
          // Fetch upcoming due items from all projects
          const upcomingPromises = projectsRes.data.map((p: Project) =>
            backlogApi.upcoming(p.id).catch(() => ({ data: [] }))
          );
          const upcomingResults = await Promise.all(upcomingPromises);
          const allUpcoming = upcomingResults.flatMap((r) => r.data);
          allUpcoming.sort((a: BacklogItem, b: BacklogItem) => {
            if (!a.due_date || !b.due_date) return 0;
            return a.due_date.localeCompare(b.due_date);
          });
          setUpcomingItems(allUpcoming);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load projects';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute stats — prefer real backend stats, fall back to client-side calculation
  const activeProjectsCount = stats?.active_projects ?? projects.length;
  const activeSprintsCount = stats?.active_sprints ?? projects.filter((p) => p.active_sprint_name !== null).length;
  const openItemsCount = stats?.open_items ?? projects.reduce((sum, p) => sum + (p.total_items - p.completed_items), 0);
  const completedItemsCount = stats?.completed_this_week ?? projects.reduce((sum, p) => sum + p.completed_items, 0);

  const formatTrend = (trend: number | undefined, suffix: string) => {
    if (trend === undefined || trend === 0) return 'No change';
    return trend > 0 ? `+${trend} ${suffix}` : `${trend} ${suffix}`;
  };

  const trendDir = (trend: number | undefined) =>
    trend !== undefined && trend > 0 ? TrendingUp : trend !== undefined && trend < 0 ? TrendingDown : TrendingDown;

  const trendClr = (trend: number | undefined, invertPositive = false) => {
    if (trend === undefined || trend === 0) return '#94A3B8';
    if (invertPositive) return trend > 0 ? '#F97316' : '#10B981';
    return trend > 0 ? '#10B981' : '#EF4444';
  };

  const statCards = [
    {
      label: 'Active Projects',
      value: activeProjectsCount,
      icon: FolderKanban,
      color: '#2563EB',
      bg: '#EFF6FF',
      trendText: formatTrend(stats?.active_projects_trend, 'vs last week'),
      trendColor: trendClr(stats?.active_projects_trend),
      TrendIcon: trendDir(stats?.active_projects_trend),
    },
    {
      label: 'Active Sprints',
      value: activeSprintsCount,
      icon: IterationCw,
      color: '#8B5CF6',
      bg: '#F5F3FF',
      trendText: formatTrend(stats?.active_sprints_trend, 'vs last week'),
      trendColor: trendClr(stats?.active_sprints_trend),
      TrendIcon: trendDir(stats?.active_sprints_trend),
    },
    {
      label: 'Open Items',
      value: openItemsCount,
      icon: AlertCircle,
      color: '#F97316',
      bg: '#FFF7ED',
      trendText: formatTrend(stats?.open_items_trend, 'vs last week'),
      trendColor: trendClr(stats?.open_items_trend, true),
      TrendIcon: trendDir(stats?.open_items_trend),
    },
    {
      label: 'Completed This Week',
      value: completedItemsCount,
      icon: CheckCircle2,
      color: '#10B981',
      bg: '#ECFDF5',
      trendText: stats ? `${stats.completed_last_week} last week` : 'No data yet',
      trendColor: trendClr(stats?.completed_trend),
      TrendIcon: trendDir(stats?.completed_trend),
    },
  ];

  // Handle create project
  const handleCreateProject = async () => {
    if (!formName.trim()) {
      setCreateError('Project name is required');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const res = await projectsApi.create({
        name: formName.trim(),
        client_name: formClient.trim() || undefined,
        description: formDescription.trim() || undefined,
        project_type: formType,
        default_sprint_duration: formDuration,
      });
      setProjects((prev) => [...prev, res.data]);
      setPanelOpen(false);
      resetForm();
      addToast('success', `Project "${res.data.name}" created successfully`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create project';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormClient('');
    setFormDescription('');
    setFormType('contract');
    setFormDuration(2);
    setCreateError(null);
  };

  const openPanel = () => {
    resetForm();
    setPanelOpen(true);
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1>{getGreeting(user?.full_name || 'there')}</h1>
          <p style={{ color: '#64748B', marginTop: 4, fontSize: 15 }}>
            Here's what's happening across your projects
          </p>
        </div>
        <Button
          icon={<Plus size={16} strokeWidth={2} />}
          onClick={openPanel}
        >
          New Project
        </Button>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))
          : statCards.map((stat) => (
              <Card key={stat.label} hoverLift>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#64748B',
                        fontWeight: 500,
                        marginBottom: 8,
                      }}
                    >
                      {stat.label}
                    </div>
                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: '#0F172A',
                        lineHeight: 1,
                      }}
                    >
                      {stat.value}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: stat.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <stat.icon
                      size={22}
                      color={stat.color}
                      strokeWidth={1.75}
                    />
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 12,
                    fontSize: 12,
                    color: stat.trendColor,
                    fontWeight: 500,
                  }}
                >
                  <stat.TrendIcon size={14} strokeWidth={2} />
                  {stat.trendText}
                </div>
              </Card>
            ))}
      </div>

      {/* Error state */}
      {error && !loading && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            color: '#DC2626',
            fontSize: 14,
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {/* Project Cards */}
      {!loading && !error && projects.length === 0 && (
        <EmptyState
          icon="\u{1F4CB}"
          title="No projects yet"
          description="Create your first project to get started"
          action={{
            label: 'New Project',
            onClick: openPanel,
            icon: <Plus size={16} strokeWidth={2} />,
          }}
        />
      )}

      {!loading && projects.length > 0 && (
        <>
          <h2 style={{ marginBottom: 16 }}>Your Projects</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
              gap: 20,
            }}
          >
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))
              : projects.map((project) => {
                  const progress = project.progress_percentage;
                  return (
                    <Card
                      key={project.id}
                      borderLeft={project.color}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <h3 style={{ marginBottom: 2 }}>{project.name}</h3>
                          <div style={{ fontSize: 13, color: '#64748B' }}>
                            {project.client_name || 'No client'}
                          </div>
                        </div>
                        <Badge
                          label={
                            projectTypeLabels[project.project_type] ||
                            project.project_type
                          }
                          color={
                            projectTypeColors[project.project_type] ||
                            '#94A3B8'
                          }
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          marginBottom: 16,
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        {project.active_sprint_name ? (
                          <span>
                            <strong style={{ color: '#0F172A' }}>
                              {project.active_sprint_name}
                            </strong>{' '}
                            active
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>
                            No active sprint
                          </span>
                        )}
                        <span>
                          {project.completed_items}/{project.total_items} items
                        </span>
                      </div>

                      <ProgressBar value={progress} showLabel />
                    </Card>
                  );
                })}
          </div>
        </>
      )}

      {/* Upcoming Due Dates */}
      {!loading && upcomingItems.length > 0 && (() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const groups: { label: string; color: string; items: BacklogItem[] }[] = [];
        const overdue: BacklogItem[] = [];
        const today: BacklogItem[] = [];
        const thisWeek: BacklogItem[] = [];
        const nextWeek: BacklogItem[] = [];

        for (const item of upcomingItems) {
          if (!item.due_date) continue;
          const due = new Date(item.due_date + 'T00:00:00');
          const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diff < 0) overdue.push(item);
          else if (diff === 0) today.push(item);
          else if (diff <= 7) thisWeek.push(item);
          else nextWeek.push(item);
        }

        if (overdue.length > 0) groups.push({ label: 'Overdue', color: '#EF4444', items: overdue });
        if (today.length > 0) groups.push({ label: 'Today', color: '#F97316', items: today });
        if (thisWeek.length > 0) groups.push({ label: 'This Week', color: '#2563EB', items: thisWeek });
        if (nextWeek.length > 0) groups.push({ label: 'Next Week', color: '#64748B', items: nextWeek });

        if (groups.length === 0) return null;

        return (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Calendar size={20} strokeWidth={2} color="#2563EB" />
              Upcoming Due Dates
            </h2>
            <Card hoverLift={false}>
              {groups.map((group) => (
                <div key={group.label} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: group.color,
                    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
                  }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/projects/${item.project_id}/backlog`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 8,
                          backgroundColor: '#F8FAFC', cursor: 'pointer',
                          transition: 'background-color 150ms',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500, color: '#0F172A',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {item.title}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: group.color,
                          whiteSpace: 'nowrap',
                        }}>
                          {item.due_date ? new Date(item.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        );
      })()}

      {/* New Project Slide Panel */}
      <SlidePanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Create New Project"
        width={420}
      >
        <div style={{ padding: 20 }}>
          {/* Project Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Project Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Mobile App Redesign"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            />
          </div>

          {/* Client Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Client Name</label>
            <input
              type="text"
              value={formClient}
              onChange={(e) => setFormClient(e.target.value)}
              placeholder="e.g. Acme Corp"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of the project..."
              rows={3}
              style={{
                ...inputStyle,
                minHeight: 80,
                resize: 'vertical' as const,
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            />
          </div>

          {/* Project Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              style={{
                ...inputStyle,
                appearance: 'auto' as const,
                backgroundColor: '#FFFFFF',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <option value="contract">Contract</option>
              <option value="full_time">Full-Time</option>
              <option value="one_off">One-Off</option>
            </select>
          </div>

          {/* Sprint Duration */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Sprint Duration</label>
            <select
              value={formDuration}
              onChange={(e) => setFormDuration(Number(e.target.value))}
              style={{
                ...inputStyle,
                appearance: 'auto' as const,
                backgroundColor: '#FFFFFF',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <option value={1}>1 week</option>
              <option value={2}>2 weeks</option>
              <option value={3}>3 weeks</option>
              <option value={4}>4 weeks</option>
            </select>
          </div>

          {/* Error */}
          {createError && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                color: '#DC2626',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {createError}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleCreateProject}
            loading={creating}
            disabled={!formName.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Create Project
          </Button>
        </div>
      </SlidePanel>
    </div>
  );
}
