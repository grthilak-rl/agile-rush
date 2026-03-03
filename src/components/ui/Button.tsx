import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    color: '#FFFFFF',
    border: 'none',
  },
  secondary: {
    background: '#FFFFFF',
    color: '#334155',
    border: '1px solid #CBD5E1',
  },
  danger: {
    background: '#F43F5E',
    color: '#FFFFFF',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: '#475569',
    border: 'none',
  },
};

const sizeStyles: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: 13 },
  md: { padding: '8px 18px', fontSize: 14 },
  lg: { padding: '10px 22px', fontSize: 15 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 8,
        fontWeight: 600,
        lineHeight: '20px',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
