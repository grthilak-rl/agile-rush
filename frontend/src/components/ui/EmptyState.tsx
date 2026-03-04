import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      )}
      <h2 style={{ color: '#334155', marginBottom: 8 }}>{title}</h2>
      <p style={{ color: '#64748B', fontSize: 15, maxWidth: 400, marginBottom: action ? 24 : 0 }}>
        {description}
      </p>
      {action && (
        <Button icon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
