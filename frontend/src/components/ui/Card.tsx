import { useState, type CSSProperties, type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  hoverLift?: boolean;
  borderLeft?: string;
  onClick?: () => void;
}

export function Card({ children, style, hoverLift = true, borderLeft, onClick }: CardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        boxShadow: hovered && hoverLift ? '0 4px 12px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'all 150ms ease',
        transform: hovered && hoverLift ? 'translateY(-2px)' : 'translateY(0)',
        cursor: onClick ? 'pointer' : undefined,
        borderLeft: borderLeft ? `4px solid ${borderLeft}` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
