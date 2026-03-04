import { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OverlayContainerProvider } from '../../contexts/OverlayContainerContext';

export function AppLayout() {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <TopBar />
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
              animation: 'fadeInUp 200ms ease forwards',
            }}
          >
            <OverlayContainerProvider containerRef={overlayRef}>
              <Outlet />
            </OverlayContainerProvider>
          </div>
        </main>
        {/* Overlay container — sits on top of the entire content area (TopBar + main) */}
        <div
          ref={overlayRef}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 998 }}
        />
      </div>
      <style>{`
        @media (max-width: 767px) {
          main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
