import { useLocation, useParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getProject } from '../../data/mockData';
import { Avatar } from '../ui/Avatar';

export function TopBar() {
  const location = useLocation();
  const { projectId } = useParams();

  const project = projectId ? getProject(projectId) : undefined;

  const breadcrumbs = buildBreadcrumbs(location.pathname, project?.name);

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
        paddingLeft: 24,
      }}
    >
      {/* Breadcrumbs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={14} color="#94A3B8" strokeWidth={1.75} />}
            {crumb.path ? (
              <Link
                to={crumb.path}
                style={{
                  color: '#94A3B8',
                  fontSize: 14,
                  fontWeight: 400,
                  textDecoration: 'none',
                }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                style={{
                  color: '#0F172A',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* User section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ textAlign: 'right', marginRight: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Sarah Chen</div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>Product Owner</div>
        </div>
        <Avatar initials="SC" color="#2563EB" size={36} />
      </div>
    </header>
  );
}

function buildBreadcrumbs(pathname: string, projectName?: string) {
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
