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
  const color = priorityColors[priority] || '#94A3B8';
  return <Badge label={priority} color={color} />;
}

const statusColors: Record<string, string> = {
  active: '#10B981',
  planning: '#2563EB',
  completed: '#8B5CF6',
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || '#94A3B8';
  return <Badge label={status} color={color} />;
}
