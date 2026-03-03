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
} from 'lucide-react';
import { getProject } from '../data/mockData';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';

export function ProjectOverview() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const project = getProject(projectId || '');

  if (!project) {
    return <div>Project not found</div>;
  }

  const sprint = project.activeSprint;
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(sprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));
  const completionPct = Math.round((sprint.completedPoints / sprint.totalPoints) * 100);
  const sprintItems = project.backlogItems.filter((i) => i.sprintId === sprint.id);
  const todoCount = sprintItems.filter((i) => i.status === 'todo').length;
  const inProgressCount = sprintItems.filter((i) => i.status === 'in-progress').length;
  const inReviewCount = sprintItems.filter((i) => i.status === 'in-review').length;
  const doneCount = sprintItems.filter((i) => i.status === 'done').length;

  const maxVelocity = Math.max(...project.velocityData.flatMap((d) => [d.planned, d.completed]));

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
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <h1>{project.name}</h1>
          <Badge label={project.type} color={project.color} />
        </div>
        <p style={{ color: '#64748B', fontSize: 15 }}>{project.client}</p>
      </div>

      {/* Active Sprint Banner */}
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
            <h2 style={{ color: '#FFFFFF' }}>{sprint.name}</h2>
            <Badge label="Active" color="#10B981" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }} />
          </div>
          <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 20 }}>{sprint.goal}</p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} strokeWidth={1.75} />
                Days Remaining
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{daysLeft}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={14} strokeWidth={1.75} />
                Completion
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{completionPct}%</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={14} strokeWidth={1.75} />
                Story Points
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {sprint.completedPoints}
                <span style={{ fontSize: 16, fontWeight: 400, color: '#94A3B8' }}>/{sprint.totalPoints}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <ProgressBar value={completionPct} height={10} />
          </div>
        </div>
      </div>

      {/* Sprint Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          { label: 'To Do', value: todoCount, icon: Clock, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'In Progress', value: inProgressCount, icon: TrendingUp, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'In Review', value: inReviewCount, icon: AlertTriangle, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Done', value: doneCount, icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
        ].map((stat) => (
          <Card key={stat.label}>
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

      {/* Two column: Velocity Chart + Team */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {project.velocityData.map((d) => (
              <div key={d.sprint} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 70, fontSize: 12, color: '#64748B', fontWeight: 500, flexShrink: 0 }}>
                  {d.sprint.replace('Sprint ', 'S')}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        height: 12,
                        width: `${(d.planned / maxVelocity) * 100}%`,
                        backgroundColor: '#E2E8F0',
                        borderRadius: 999,
                        minWidth: 4,
                      }}
                    />
                    <span style={{ fontSize: 11, color: '#94A3B8', minWidth: 20 }}>{d.planned}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        height: 12,
                        width: `${(d.completed / maxVelocity) * 100}%`,
                        background: 'linear-gradient(90deg, #2563EB, #8B5CF6)',
                        borderRadius: 999,
                        minWidth: 4,
                      }}
                    />
                    <span style={{ fontSize: 11, color: '#2563EB', fontWeight: 600, minWidth: 20 }}>{d.completed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#E2E8F0' }} />
              <span style={{ color: '#64748B' }}>Planned</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(90deg, #2563EB, #8B5CF6)' }} />
              <span style={{ color: '#64748B' }}>Completed</span>
            </div>
          </div>
        </Card>

        {/* Team Members */}
        <Card hoverLift={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Users size={18} color="#64748B" strokeWidth={1.75} />
            <h3>Team Members</h3>
            <Badge label={`${project.team.length} members`} color="#2563EB" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {project.team.map((member) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  transition: 'background-color 150ms ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Avatar initials={member.initials} color={member.color} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card hoverLift={false}>
        <h3 style={{ marginBottom: 16 }}>Recent Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {project.activities.map((activity, i) => (
            <div
              key={activity.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: i < project.activities.length - 1 ? '1px solid #F1F5F9' : undefined,
              }}
            >
              <Avatar initials={activity.user.initials} color={activity.user.color} size={32} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{activity.user.name}</span>{' '}
                <span style={{ color: '#64748B' }}>{activity.action}</span>{' '}
                <span style={{ fontWeight: 500 }}>{activity.target}</span>
              </div>
              <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
