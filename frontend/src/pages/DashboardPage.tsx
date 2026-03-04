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
} from 'lucide-react';
import { projectsApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import type { Project } from '../types';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch projects on mount
  useEffect(() => {
    let cancelled = false;
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await projectsApi.list();
        if (!cancelled) {
          setProjects(res.data);
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
    fetchProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute stats
  const activeProjectsCount = projects.length;
  const activeSprintsCount = projects.filter(
    (p) => p.active_sprint_name !== null
  ).length;
  const openItemsCount = projects.reduce(
    (sum, p) => sum + (p.total_items - p.completed_items),
    0
  );
  const completedItemsCount = projects.reduce(
    (sum, p) => sum + p.completed_items,
    0
  );

  const statCards = [
    {
      label: 'Active Projects',
      value: activeProjectsCount,
      icon: FolderKanban,
      color: '#2563EB',
      bg: '#EFF6FF',
      trendText: `+${activeProjectsCount} active`,
      trendColor: '#10B981',
      TrendIcon: TrendingUp,
    },
    {
      label: 'Active Sprints',
      value: activeSprintsCount,
      icon: IterationCw,
      color: '#8B5CF6',
      bg: '#F5F3FF',
      trendText:
        activeSprintsCount > 0
          ? `${activeSprintsCount} running`
          : 'No sprints',
      trendColor: activeSprintsCount > 0 ? '#10B981' : '#94A3B8',
      TrendIcon: activeSprintsCount > 0 ? TrendingUp : TrendingDown,
    },
    {
      label: 'Open Items',
      value: openItemsCount,
      icon: AlertCircle,
      color: '#F97316',
      bg: '#FFF7ED',
      trendText:
        openItemsCount > 0
          ? `${openItemsCount} remaining`
          : 'All clear',
      trendColor: openItemsCount > 0 ? '#F97316' : '#10B981',
      TrendIcon: openItemsCount > 0 ? TrendingUp : TrendingDown,
    },
    {
      label: 'Completed This Week',
      value: completedItemsCount,
      icon: CheckCircle2,
      color: '#10B981',
      bg: '#ECFDF5',
      trendText:
        completedItemsCount > 0
          ? `+${completedItemsCount} done`
          : 'No completions yet',
      trendColor: completedItemsCount > 0 ? '#10B981' : '#94A3B8',
      TrendIcon: completedItemsCount > 0 ? TrendingUp : TrendingDown,
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
