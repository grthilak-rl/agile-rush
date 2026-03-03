interface PointsBadgeProps {
  points: number;
  size?: number;
}

export function PointsBadge({ points, size = 28 }: PointsBadgeProps) {
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
