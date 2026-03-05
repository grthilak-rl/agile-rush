import { useEffect, useCallback } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

function isInputElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (isInputElement(e.target)) return;

      const meta = e.metaKey || e.ctrlKey;
      let key = '';

      if (meta && e.key === 'k') key = 'mod+k';
      else if (meta && e.key === 'b') key = 'mod+b';
      else if (!meta && !e.altKey) {
        // Single key shortcuts (only when no modifier is held)
        switch (e.key) {
          case 'n': key = 'n'; break;
          case 'b': key = 'b'; break;
          case 'l': key = 'l'; break;
          case 's': key = 's'; break;
          case 'd': key = 'd'; break;
          case 't': key = 't'; break;
          case '?': key = '?'; break;
          case 'Escape': key = 'escape'; break;
        }
      }

      if (key && shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}
