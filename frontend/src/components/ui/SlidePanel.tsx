import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useOverlayContainer } from '../../contexts/OverlayContainerContext';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: ReactNode;
}

export function SlidePanel({ isOpen, onClose, title, width = 420, children }: SlidePanelProps) {
  const overlayContainer = useOverlayContainer();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handler);
    }
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 998,
          pointerEvents: 'auto',
          animation: 'fadeIn 200ms ease forwards',
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: width,
          maxWidth: '100%',
          backgroundColor: '#FFFFFF',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.12)',
          pointerEvents: 'auto',
          animation: 'slideInRight 250ms ease forwards',
        }}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0,
            }}
          >
            <h3>{title}</h3>
            <button
              onClick={onClose}
              style={{ padding: 4, color: '#94A3B8', cursor: 'pointer', borderRadius: 6 }}
              aria-label="Close panel"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        )}
        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </div>
    </>
  );

  // Portal into the overlay container (scoped to content area, not covering sidebar)
  if (overlayContainer) {
    return createPortal(content, overlayContainer);
  }

  // Fallback: render in place
  return content;
}
