import type { CSSProperties } from 'react';

interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
  style?: CSSProperties;
}

export function Avatar({ initials, color, size = 32, style }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        backgroundColor: color,
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
      aria-label={initials}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  avatars: { initials: string; color: string }[];
  size?: number;
  max?: number;
}

export function AvatarGroup({ avatars, size = 32, max = 5 }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((a, i) => (
        <Avatar
          key={i}
          initials={a.initials}
          color={a.color}
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
