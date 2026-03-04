import type { CSSProperties } from 'react';

interface AvatarProps {
  initials?: string;
  color?: string;
  name?: string;
  size?: number;
  style?: CSSProperties;
}

const defaultColors = ['#2563EB', '#8B5CF6', '#F97316', '#10B981', '#F43F5E', '#EAB308', '#06B6D4', '#EC4899'];

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return defaultColors[Math.abs(hash) % defaultColors.length];
}

export function Avatar({ initials, color, name, size = 32, style }: AvatarProps) {
  const displayInitials = initials || (name ? getInitials(name) : '?');
  const bgColor = color || (name ? getColorFromName(name) : '#94A3B8');

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        backgroundColor: bgColor,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.375,
        fontWeight: 600,
        lineHeight: 1,
        userSelect: 'none',
        ...style,
      }}
      title={name}
      aria-label={name || displayInitials}
    >
      {displayInitials}
    </div>
  );
}

interface AvatarGroupProps {
  items: { name: string; color?: string }[];
  size?: number;
  max?: number;
}

export function AvatarGroup({ items, size = 32, max = 5 }: AvatarGroupProps) {
  const visible = items.slice(0, max);
  const remaining = items.length - max;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((item, i) => (
        <Avatar
          key={i}
          name={item.name}
          color={item.color}
          size={size}
          style={{
            marginLeft: i === 0 ? 0 : -8,
            border: '2px solid #FFFFFF',
            zIndex: visible.length - i,
            position: 'relative',
          }}
        />
      ))}
      {remaining > 0 && (
        <div
          style={{
            width: size,
            height: size,
            minWidth: size,
            borderRadius: '50%',
            backgroundColor: '#E2E8F0',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.35,
            fontWeight: 600,
            marginLeft: -8,
            border: '2px solid #FFFFFF',
            position: 'relative',
          }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
