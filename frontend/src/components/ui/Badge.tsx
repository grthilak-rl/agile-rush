import type { CSSProperties } from 'react';

interface BadgeProps {
  label: string;
  color: string;
  style?: CSSProperties;
}

export function Badge({ label, color, style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 999,
        backgroundColor: `${color}26`,
        color: color,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: '16px',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label}
    </span>
  );
}

const priorityColors: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#3B82F6',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge label={priority} color={priorityColors[priority] || '#94A3B8'} />;
}

const statusColors: Record<string, string> = {
  backlog: '#94A3B8',
  todo: '#6366F1',
  in_progress: '#2563EB',
  in_review: '#F59E0B',
  done: '#10B981',
  active: '#10B981',
  planning: '#2563EB',
  completed: '#8B5CF6',
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  return <Badge label={label} color={statusColors[status] || '#94A3B8'} />;
}

const typeColors: Record<string, string> = {
  story: '#3B82F6',
  task: '#8B5CF6',
  bug: '#F43F5E',
};

export function TypeBadge({ type }: { type: string }) {
  return <Badge label={type} color={typeColors[type] || '#94A3B8'} />;
}
