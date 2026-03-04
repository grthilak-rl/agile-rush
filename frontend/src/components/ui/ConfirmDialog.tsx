import { createPortal } from 'react-dom';
import { Button } from './Button';
import { useOverlayContainer } from '../../contexts/OverlayContainerContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayContainer = useOverlayContainer();

  if (!isOpen) return null;

  const content = (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          pointerEvents: 'auto',
          animation: 'fadeIn 150ms ease forwards',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 24,
          width: 400,
          maxWidth: '90vw',
          zIndex: 1001,
          pointerEvents: 'auto',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
          animation: 'fadeInUp 200ms ease forwards',
        }}
      >
        <h3 style={{ marginBottom: 8 }}>{title}</h3>
        <p style={{ color: '#64748B', fontSize: 14, lineHeight: '22px', marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );

  if (overlayContainer) {
    return createPortal(content, overlayContainer);
  }

  return content;
}
