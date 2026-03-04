import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#E2E8F0',
        animation: 'pulse 1.5s infinite ease-in-out',
        ...style,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Skeleton width="60%" height={20} style={{ marginBottom: 12 }} />
      <Skeleton width="40%" height={14} style={{ marginBottom: 16 }} />
      <Skeleton height={8} borderRadius={999} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 4 }}>
        <Skeleton width={28} height={28} borderRadius={14} />
        <Skeleton width={28} height={28} borderRadius={14} />
        <Skeleton width={28} height={28} borderRadius={14} />
      </div>
    </div>
  );
}

export function BacklogItemSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: '#FAFBFC',
        borderRadius: 10,
        borderLeft: '4px solid #E2E8F0',
      }}
    >
      <Skeleton width={16} height={16} />
      <Skeleton width={28} height={28} borderRadius={6} />
      <div style={{ flex: 1 }}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 4 }} />
        <Skeleton width="30%" height={12} />
      </div>
      <Skeleton width={60} height={20} borderRadius={999} />
      <Skeleton width={28} height={28} borderRadius={14} />
      <Skeleton width={32} height={32} borderRadius={16} />
    </div>
  );
}
