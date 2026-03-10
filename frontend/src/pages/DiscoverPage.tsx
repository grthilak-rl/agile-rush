import { useState, useEffect, useRef } from 'react';
import { Compass, Search, Users, UserPlus, Loader2, Check, X, ChevronDown } from 'lucide-react';
import { projectsApi, membersApi, type DiscoverProject } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function DiscoverPage() {
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<DiscoverProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadProjects('');
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadProjects = async (q: string) => {
    setLoading(true);
    try {
      const res = await projectsApi.discover(q || undefined);
      setProjects(res.data);
    } catch {
      addToast('error', 'Failed to load projects');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => loadProjects(value), 300);
  };

  const handleRequestJoin = async (project: DiscoverProject) => {
    setRequestingId(project.id);
    try {
      await membersApi.requestJoin(project.id);
      setProjects((prev) =>
        prev.map((p) => p.id === project.id ? { ...p, pending_request: true } : p)
      );
      addToast('success', `Join request sent to ${project.name}`);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to send join request';
      if (err.response?.status === 400) {
        setProjects((prev) =>
          prev.map((p) => p.id === project.id ? { ...p, pending_request: true } : p)
        );
      }
      addToast('error', detail);
    } finally {
      setRequestingId(null);
    }
  };

  const handleWithdraw = async (project: DiscoverProject) => {
    setWithdrawingId(project.id);
    setOpenDropdownId(null);
    try {
      await membersApi.withdrawRequest(project.id);
      setProjects((prev) =>
        prev.map((p) => p.id === project.id ? { ...p, pending_request: false } : p)
      );
      addToast('success', `Request withdrawn from ${project.name}`);
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to withdraw request');
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          margin: '0 0 6px 0',
        }}>
          <Compass size={22} color="#2563EB" />
          Discover Projects
        </h1>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>
          Browse projects and request to join teams
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          type="text"
          placeholder="Search projects by name or description..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px 12px 42px',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            fontSize: 15,
            color: '#0F172A',
            outline: 'none',
            transition: 'border-color 150ms ease',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
        />
      </div>

      {/* Results */}
      {initialLoad || loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : projects.length === 0 ? (
        <Card hoverLift={false}>
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8' }}>
            <Users size={36} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px 0' }}>
              {query ? 'No projects found' : 'No projects available to join'}
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {query ? 'Try a different search term' : 'All projects already have you as a member'}
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map((project) => (
            <Card key={project.id} hoverLift={false}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', margin: '0 0 4px 0' }}>
                    {project.name}
                  </h3>
                  {project.description && (
                    <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                      {project.description.length > 150 ? project.description.slice(0, 150) + '...' : project.description}
                    </p>
                  )}
                  {project.owner && (
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>
                      Owned by {project.owner.full_name}
                    </div>
                  )}
                </div>

                {project.pending_request ? (
                  <div style={{ position: 'relative' }} ref={openDropdownId === project.id ? dropdownRef : undefined}>
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === project.id ? null : project.id)}
                      disabled={withdrawingId === project.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#64748B',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        opacity: withdrawingId === project.id ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Check size={14} color="#10B981" />
                      {withdrawingId === project.id ? 'Withdrawing...' : 'Requested'}
                      <ChevronDown size={13} />
                    </button>

                    {openDropdownId === project.id && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 10,
                        overflow: 'hidden',
                        minWidth: 170,
                      }}>
                        <button
                          onClick={() => handleWithdraw(project)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#EF4444',
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background-color 150ms ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <X size={14} />
                          Withdraw Request
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    icon={<UserPlus size={14} />}
                    onClick={() => handleRequestJoin(project)}
                    loading={requestingId === project.id}
                    disabled={requestingId !== null}
                  >
                    Request to Join
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
