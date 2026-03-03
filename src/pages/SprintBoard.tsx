import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, ListChecks, Bug, Plus } from 'lucide-react';
import { getProject, type BacklogItem } from '../data/mockData';
import { Badge } from '../components/ui/Badge';
import { PointsBadge } from '../components/ui/PointsBadge';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';

const columns: {
  key: BacklogItem['status'];
  label: string;
  emoji: string;
  color: string;
}[] = [
  { key: 'todo', label: 'To Do', emoji: '\uD83D\uDCCB', color: '#6366F1' },
  { key: 'in-progress', label: 'In Progress', emoji: '\u26A1', color: '#2563EB' },
  { key: 'in-review', label: 'In Review', emoji: '\uD83D\uDD0D', color: '#F59E0B' },
  { key: 'done', label: 'Done', emoji: '\u2705', color: '#10B981' },
];

const typeConfig: Record<string, { icon: typeof BookOpen; color: string }> = {
  story: { icon: BookOpen, color: '#3B82F6' },
  task: { icon: ListChecks, color: '#8B5CF6' },
  bug: { icon: Bug, color: '#F43F5E' },
};

const priorityBorderColors: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#3B82F6',
};

export function SprintBoard() {
  const { projectId } = useParams();
  const project = getProject(projectId || '');

  if (!project) return <div>Project not found</div>;

  const sprint = project.activeSprint;
  const sprintItems = project.backlogItems.filter((i) => i.sprintId === sprint.id);
  const completionPct = Math.round((sprint.completedPoints / sprint.totalPoints) * 100);
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(sprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <div>
      {/* Sprint Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2>{sprint.name}</h2>
            <Badge label="Active" color="#10B981" />
            <Badge label={`${daysLeft} days left`} color="#F97316" />
          </div>
          <div style={{ fontSize: 13, color: '#64748B' }}>
            {sprint.completedPoints}/{sprint.totalPoints} story points
          </div>
        </div>
        <p style={{ color: '#64748B', fontSize: 14, marginBottom: 14 }}>
          <strong>Sprint Goal:</strong> {sprint.goal}
        </p>
        <ProgressBar value={completionPct} height={8} showLabel />
      </div>

      {/* Board Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          minHeight: 'calc(100vh - 300px)',
        }}
      >
        {columns.map((col) => {
          const items = sprintItems.filter((i) => i.status === col.key);
          return (
            <div
              key={col.key}
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: `2px solid ${col.color}`,
                }}
              >
                <span style={{ fontSize: 16 }}>{col.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                  {col.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: col.color,
                    backgroundColor: `${col.color}15`,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {items.map((item) => (
                  <BoardCard key={item.id} item={item} />
                ))}

                {/* Drop placeholder */}
                <div
                  style={{
                    border: '2px dashed #CBD5E1',
                    borderRadius: 10,
                    padding: 16,
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    minHeight: 48,
                    marginTop: items.length > 0 ? 0 : 'auto',
                  }}
                >
                  <Plus size={14} strokeWidth={2} />
                  Drop here
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function BoardCard({ item }: { item: BacklogItem }) {
  const [hovered, setHovered] = useState(false);
  const tc = typeConfig[item.type];
  const TypeIcon = tc.icon;
  const borderColor = priorityBorderColors[item.priority] || '#CBD5E1';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 14,
        borderTop: `3px solid ${borderColor}`,
        boxShadow: hovered
          ? '0 4px 12px rgba(0,0,0,0.12)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px) rotate(0.5deg)' : 'translateY(0) rotate(0)',
        transition: 'all 150ms ease',
        cursor: 'grab',
      }}
    >
      {/* Type & Labels */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            backgroundColor: `${tc.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TypeIcon size={12} color={tc.color} strokeWidth={2} />
        </div>
        {item.labels.slice(0, 2).map((label) => (
          <span
            key={label}
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#64748B',
              padding: '1px 6px',
              backgroundColor: '#F1F5F9',
              borderRadius: 999,
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: '#0F172A',
          lineHeight: '20px',
          marginBottom: 10,
        }}
      >
        {item.title}
      </div>

      {/* Subtask progress */}
      {item.subtasks && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
            <span>Subtasks</span>
            <span>{item.subtasks.completed}/{item.subtasks.total}</span>
          </div>
          <ProgressBar value={(item.subtasks.completed / item.subtasks.total) * 100} height={4} />
        </div>
      )}

      {/* Footer: assignee + points */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {item.assignee ? (
          <Avatar initials={item.assignee.initials} color={item.assignee.color} size={26} />
        ) : (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: '2px dashed #CBD5E1',
            }}
          />
        )}
        <PointsBadge points={item.points} size={24} />
      </div>
    </div>
  );
}
