import { useRef, useState, useMemo } from 'react';
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OverlayContainerProvider } from '../../contexts/OverlayContainerContext';
import { GlobalSearch } from '../search/GlobalSearch';
import { ShortcutsHelp } from '../shortcuts/ShortcutsHelp';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export function AppLayout() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { projectId } = useParams();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const isProjectContext = location.pathname.startsWith('/projects/');

  const shortcuts = useMemo(
    () => ({
      'mod+k': () => setSearchOpen(true),
      'd': () => navigate('/dashboard'),
      't': () => navigate('/my-tasks'),
      'b': () => { if (isProjectContext && projectId) navigate(`/projects/${projectId}/board`); },
      'l': () => { if (isProjectContext && projectId) navigate(`/projects/${projectId}/backlog`); },
      's': () => { if (isProjectContext && projectId) navigate(`/projects/${projectId}/sprints`); },
      '?': () => setShortcutsOpen(true),
      'escape': () => { setSearchOpen(false); setShortcutsOpen(false); },
    }),
    [navigate, projectId, isProjectContext]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <TopBar onSearchClick={() => setSearchOpen(true)} />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#F1F5F9',
            padding: 28,
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: '0 auto',
              animation: 'fadeIn 200ms ease forwards',
            }}
          >
            <OverlayContainerProvider containerRef={overlayRef}>
              <Outlet />
            </OverlayContainerProvider>
          </div>
        </main>
        {/* Overlay container */}
        <div
          ref={overlayRef}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 998 }}
        />
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <style>{`
        @media (max-width: 767px) {
          main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
