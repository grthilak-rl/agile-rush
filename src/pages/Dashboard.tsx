import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  IterationCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { projects, dashboardStats } from '../data/mockData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AvatarGroup } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';

const statCards = [
  {
    label: 'Active Projects',
    value: dashboardStats.activeProjects,
    icon: FolderKanban,
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    label: 'Active Sprints',
    value: dashboardStats.activeSprints,
    icon: IterationCw,
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    label: 'Open Items',
    value: dashboardStats.openItems,
    icon: AlertCircle,
    color: '#F97316',
    bg: '#FFF7ED',
  },
  {
    label: 'Completed This Week',
    value: dashboardStats.completedThisWeek,
    icon: CheckCircle2,
    color: '#10B981',
    bg: '#ECFDF5',
  },
];

export function Dashboard() {
  const navigate = useNavigate();

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
          <h1>Good morning, Sarah</h1>
          <p style={{ color: '#64748B', marginTop: 4, fontSize: 15 }}>
            Here's what's happening across your projects
          </p>
        </div>
        <Button icon={<Plus size={16} strokeWidth={2} />}>New Project</Button>
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
        {statCards.map((stat) => (
          <Card key={stat.label} hoverLift>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 8 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
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
                <stat.icon size={22} color={stat.color} strokeWidth={1.75} />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 12,
                fontSize: 12,
                color: '#10B981',
                fontWeight: 500,
              }}
            >
              <TrendingUp size={14} strokeWidth={2} />
              +12% from last week
            </div>
          </Card>
        ))}
      </div>

      {/* Project Cards */}
      <h2 style={{ marginBottom: 16 }}>Your Projects</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: 20,
        }}
      >
        {projects.map((project) => (
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
                <div style={{ fontSize: 13, color: '#64748B' }}>{project.client}</div>
              </div>
              <Badge label={project.type} color={project.color} />
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
              <span>
                <strong style={{ color: '#0F172A' }}>{project.activeSprint.name}</strong> active
              </span>
              <span>
                {project.activeSprint.completedPoints}/{project.activeSprint.totalPoints} pts
              </span>
            </div>

            <ProgressBar value={project.progress} showLabel />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
              }}
            >
              <AvatarGroup
                avatars={project.team.map((m) => ({ initials: m.initials, color: m.color }))}
                size={30}
              />
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                {project.totalSprints} sprints total
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
