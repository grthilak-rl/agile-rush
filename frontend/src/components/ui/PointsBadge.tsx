interface PointsBadgeProps {
  points: number | null;
  size?: number;
}

export function PointsBadge({ points, size = 28 }: PointsBadgeProps) {
  if (points === null || points === undefined) {
    return (
      <div
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: '50%',
          backgroundColor: '#F1F5F9',
          color: '#94A3B8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.43,
          fontWeight: 600,
          lineHeight: 1,
          border: '1.5px dashed #CBD5E1',
        }}
        title="No story points"
      >
        —
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        backgroundColor: '#EFF6FF',
        color: '#2563EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.43,
        fontWeight: 700,
        lineHeight: 1,
        border: '1.5px solid #BFDBFE',
      }}
      title={`${points} story points`}
    >
      {points}
    </div>
  );
}
