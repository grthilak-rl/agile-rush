import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#F0FDF4', border: '#BBF7D0', icon: '#10B981' },
  error: { bg: '#FEF2F2', border: '#FECACA', icon: '#EF4444' },
  info: { bg: '#EFF6FF', border: '#BFDBFE', icon: '#2563EB' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '#F59E0B' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          const color = colors[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                backgroundColor: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                minWidth: 300,
                maxWidth: 420,
                pointerEvents: 'auto',
                animation: toast.exiting ? 'toastOut 300ms ease forwards' : 'toastIn 300ms ease forwards',
              }}
            >
              <Icon size={18} color={color.icon} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  padding: 2,
                  color: '#94A3B8',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
