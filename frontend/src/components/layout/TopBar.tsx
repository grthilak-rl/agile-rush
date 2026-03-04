import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { projectsApi } from '../../api/client';
import { Avatar } from '../ui/Avatar';

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user, logout } = useAuth();
  const [projectName, setProjectName] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      projectsApi.get(projectId).then((res) => setProjectName(res.data.name)).catch(() => setProjectName(null));
    } else {
      setProjectName(null);
    }
  }, [projectId]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const breadcrumbs = buildBreadcrumbs(location.pathname, projectName);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      style={{
        height: 60,
        minHeight: 60,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={14} color="#94A3B8" strokeWidth={1.75} />}
            {crumb.path ? (
              <Link
                to={crumb.path}
                style={{ color: '#94A3B8', fontSize: 14, fontWeight: 400, textDecoration: 'none' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span style={{ color: '#0F172A', fontSize: 14, fontWeight: 600 }}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* User dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 8,
            transition: 'background-color 150ms ease',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{user?.full_name || 'User'}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{user?.email}</div>
          </div>
          <Avatar name={user?.full_name || 'U'} size={36} />
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              width: 220,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              border: '1px solid #E2E8F0',
              padding: 8,
              zIndex: 100,
              animation: 'fadeIn 150ms ease forwards',
            }}
          >
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{user?.full_name}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{user?.email}</div>
            </div>
            <button
              onClick={() => { setDropdownOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 14,
                color: '#334155',
                cursor: 'pointer',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <User size={16} strokeWidth={1.75} />
              Profile Settings
            </button>
            <div style={{ height: 1, backgroundColor: '#F1F5F9', margin: '4px 0' }} />
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 14,
                color: '#EF4444',
                cursor: 'pointer',
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <LogOut size={16} strokeWidth={1.75} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function buildBreadcrumbs(pathname: string, projectName: string | null) {
  const crumbs: { label: string; path?: string }[] = [];

  if (pathname === '/dashboard' || pathname === '/') {
    crumbs.push({ label: 'Dashboard' });
    return crumbs;
  }

  crumbs.push({ label: 'Dashboard', path: '/dashboard' });

  if (pathname.startsWith('/projects/')) {
    const segments = pathname.split('/').filter(Boolean);
    const pid = segments[1];

    if (segments.length === 2) {
      crumbs.push({ label: projectName || 'Project' });
    } else {
      crumbs.push({ label: projectName || 'Project', path: `/projects/${pid}` });
      const page = segments[2];
      const pageLabels: Record<string, string> = {
        backlog: 'Product Backlog',
        board: 'Sprint Board',
        sprints: 'Sprints',
        reports: 'Reports',
        settings: 'Settings',
      };
      crumbs.push({ label: pageLabels[page] || page });
    }
  }

  return crumbs;
}
