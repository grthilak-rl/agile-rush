interface ProgressBarProps {
  value: number;
  height?: number;
  showLabel?: boolean;
}

export function ProgressBar({ value, height = 8, showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div
        style={{
          flex: 1,
          height,
          backgroundColor: '#E2E8F0',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #2563EB, #8B5CF6)',
            borderRadius: 999,
            animation: 'progressFill 600ms ease-out forwards',
            transition: 'width 400ms ease',
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', minWidth: 36, textAlign: 'right' }}>
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
