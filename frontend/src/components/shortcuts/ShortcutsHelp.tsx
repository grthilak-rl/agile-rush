import { X } from 'lucide-react';

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['Cmd', 'K'], desc: 'Open search' },
  { keys: ['N'], desc: 'New item (in backlog)' },
  { keys: ['B'], desc: 'Go to board' },
  { keys: ['L'], desc: 'Go to backlog' },
  { keys: ['S'], desc: 'Go to sprints' },
  { keys: ['D'], desc: 'Go to dashboard' },
  { keys: ['T'], desc: 'Go to my tasks' },
  { keys: ['?'], desc: 'Show keyboard shortcuts' },
  { keys: ['Esc'], desc: 'Close modal / panel' },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 100ms ease forwards',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #F1F5F9',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Keyboard Shortcuts</span>
          <button
            onClick={onClose}
            style={{ padding: 4, borderRadius: 4, cursor: 'pointer', color: '#94A3B8' }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div style={{ padding: '8px 20px 20px' }}>
          {shortcuts.map((s) => (
            <div
              key={s.desc}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid #F8FAFC',
              }}
            >
              <span style={{ fontSize: 14, color: '#334155' }}>{s.desc}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      backgroundColor: '#F1F5F9',
                      color: '#334155',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      border: '1px solid #E2E8F0',
                      minWidth: 24,
                      textAlign: 'center',
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
