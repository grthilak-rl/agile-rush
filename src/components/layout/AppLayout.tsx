import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar />
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#F1F5F9',
            padding: 24,
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: '0 auto',
              animation: 'fadeInUp 200ms ease forwards',
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
      <style>{`
        @media (max-width: 767px) {
          main {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
