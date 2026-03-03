import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Kanban,
  IterationCw,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  X,
} from 'lucide-react';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
];

const projectNavItems = [
  { icon: FolderKanban, label: 'Overview', path: '' },
  { icon: ListChecks, label: 'Backlog', path: '/backlog' },
  { icon: Kanban, label: 'Board', path: '/board' },
  { icon: IterationCw, label: 'Sprints', path: '/sprints' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const isProjectContext = location.pathname.startsWith('/projects/');

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setMobileOpen(false);
      } else if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    if (isProjectContext && projectId) {
      const fullPath = `/projects/${projectId}${path}`;
      if (path === '') return location.pathname === `/projects/${projectId}`;
      return location.pathname === fullPath;
    }
    return false;
  };

  const handleNav = (path: string) => {
    if (path === '/dashboard') {
      navigate('/dashboard');
    } else if (projectId) {
      navigate(`/projects/${projectId}${path}`);
    }
  };

  const sidebarWidth = collapsed ? 64 : 260;

  const sidebarContent = (
    <div
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        height: '100vh',
        backgroundColor: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms ease-in-out, min-width 200ms ease-in-out',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: collapsed ? '20px 16px' : '20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          minHeight: 60,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            minWidth: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={18} color="#FFFFFF" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span
            style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            SprintFlow
          </span>
        )}
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflow: 'auto' }}>
        <div style={{ marginBottom: 8 }}>
          {!collapsed && (
            <div
              style={{
                padding: '4px 12px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Main
            </div>
          )}
          {mainNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: collapsed ? '10px 14px' : '10px 12px',
                  borderRadius: 8,
                  color: active ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: active ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                  borderLeft: active ? '3px solid #2563EB' : '3px solid transparent',
                  transition: 'all 150ms ease',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap',
                  justifyContent: collapsed ? 'center' : undefined,
                }}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
              >
                <item.icon size={18} strokeWidth={1.75} />
                {!collapsed && item.label}
              </button>
            );
          })}
        </div>

        {isProjectContext && (
          <div style={{ marginTop: 16 }}>
            {!collapsed && (
              <div
                style={{
                  padding: '4px 12px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Project
              </div>
            )}
            {projectNavItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: collapsed ? '10px 14px' : '10px 12px',
                    borderRadius: 8,
                    color: active ? '#FFFFFF' : '#94A3B8',
                    backgroundColor: active ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                    borderLeft: active ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'all 150ms ease',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    whiteSpace: 'nowrap',
                    justifyContent: collapsed ? 'center' : undefined,
                  }}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <item.icon size={18} strokeWidth={1.75} />
                  {!collapsed && item.label}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          gap: 8,
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: '#64748B',
          cursor: 'pointer',
          transition: 'color 150ms ease',
          fontSize: 13,
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={18} strokeWidth={1.75} />
        ) : (
          <>
            <span>Collapse</span>
            <ChevronLeft size={18} strokeWidth={1.75} />
          </>
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 1001,
          padding: 8,
          borderRadius: 8,
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          cursor: 'pointer',
        }}
        className="mobile-menu-btn"
        aria-label="Open menu"
      >
        <Menu size={20} strokeWidth={1.75} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Desktop sidebar */}
      <div className="sidebar-desktop">{sidebarContent}</div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: -44,
              padding: 8,
              borderRadius: 8,
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              cursor: 'pointer',
              zIndex: 1001,
            }}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
          {sidebarContent}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 768px) {
          .mobile-menu-btn { display: none !important; }
        }
        .sidebar-desktop button:hover {
          color: #FFFFFF !important;
        }
      `}</style>
    </>
  );
}
