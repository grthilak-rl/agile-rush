import { useState, type CSSProperties, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFFFFF' },
  secondary: { background: '#FFFFFF', color: '#334155', border: '1px solid #CBD5E1' },
  danger: { background: '#F43F5E', color: '#FFFFFF' },
  ghost: { background: 'transparent', color: '#475569' },
};

const hoverBg: Record<ButtonVariant, string> = {
  primary: 'linear-gradient(135deg, #1D4ED8, #1E40AF)',
  secondary: '#F8FAFC',
  danger: '#E11D48',
  ghost: '#F1F5F9',
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
  loading = false,
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 8,
        fontWeight: 600,
        lineHeight: '20px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 150ms ease',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        opacity: isDisabled ? 0.6 : 1,
        border: 'none',
        ...variantStyles[variant],
        ...(hovered && !isDisabled ? { background: hoverBg[variant] } : {}),
        ...sizeStyles[size],
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
