import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, FolderKanban, Search, Loader2, UserX, UserCheck, KeyRound, ShieldCheck, ShieldOff, Trash2, Copy } from 'lucide-react';
import { adminApi, type AdminUser, type AdminProject, type AdminStats } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type Tab = 'users' | 'projects';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [tab, setTab] = useState<Tab>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersQuery, setUsersQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [projectsPage, setProjectsPage] = useState(1);
  const [projectsQuery, setProjectsQuery] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{ userId: string; password: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; name: string } | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Load stats
  useEffect(() => {
    adminApi.stats().then(res => setStats(res.data)).catch(() => {});
  }, []);

  // Load users
  useEffect(() => {
    if (tab === 'users') loadUsers();
  }, [tab, usersPage]);

  // Load projects
  useEffect(() => {
    if (tab === 'projects') loadProjects();
  }, [tab, projectsPage]);

  const loadUsers = async (q?: string) => {
    setUsersLoading(true);
    try {
      const res = await adminApi.listUsers({ page: usersPage, per_page: 20, q: q ?? (usersQuery || undefined) });
      setUsers(res.data.users);
      setUsersTotal(res.data.total);
    } catch {
      addToast('error', 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadProjects = async (q?: string) => {
    setProjectsLoading(true);
    try {
      const res = await adminApi.listProjects({ page: projectsPage, per_page: 20, q: q ?? (projectsQuery || undefined) });
      setProjects(res.data.projects);
      setProjectsTotal(res.data.total);
    } catch {
      addToast('error', 'Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleUserSearch = (value: string) => {
    setUsersQuery(value);
    setUsersPage(1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => loadUsers(value), 300);
  };

  const handleProjectSearch = (value: string) => {
    setProjectsQuery(value);
    setProjectsPage(1);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => loadProjects(value), 300);
  };

  const handleDisableEnable = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      if (u.is_disabled) {
        await adminApi.enableUser(u.id);
        addToast('success', `${u.full_name} has been enabled`);
      } else {
        await adminApi.disableUser(u.id);
        addToast('success', `${u.full_name} has been disabled`);
      }
      loadUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleResetPassword = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      const res = await adminApi.resetPassword(u.id);
      setTempPassword({ userId: u.id, password: res.data.temporary_password });
      addToast('success', `Password reset for ${u.full_name}`);
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAdmin = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      await adminApi.toggleAdmin(u.id);
      addToast('success', `${u.full_name} admin status updated`);
      loadUsers();
      adminApi.stats().then(res => setStats(res.data)).catch(() => {});
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleDeleteProject = async (p: AdminProject) => {
    setActionLoading(p.id);
    try {
      await adminApi.deleteProject(p.id);
      addToast('success', `Project "${p.name}" deleted`);
      loadProjects();
      adminApi.stats().then(res => setStats(res.data)).catch(() => {});
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to delete project');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const executeConfirmedAction = () => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;
    if (type === 'disable' || type === 'enable') {
      const u = users.find(u => u.id === id);
      if (u) handleDisableEnable(u);
    } else if (type === 'toggle-admin') {
      const u = users.find(u => u.id === id);
      if (u) handleToggleAdmin(u);
    } else if (type === 'delete-project') {
      const p = projects.find(p => p.id === id);
      if (p) handleDeleteProject(p);
    }
  };

  if (!user?.is_admin) return null;

  const perPage = 20;
  const usersTotalPages = Math.ceil(usersTotal / perPage);
  const projectsTotalPages = Math.ceil(projectsTotal / perPage);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: active ? '#2563EB' : '#64748B',
    borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: active ? '#2563EB' : 'transparent',
  });

  const badgeStyle = (color: string, bg: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    color,
    backgroundColor: bg,
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 6px 0' }}>
          <Shield size={22} color="#2563EB" />
          Site Administration
        </h1>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Manage users and projects across the platform</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <Card hoverLift={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>{stats.total_users}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Total Users</div>
              </div>
            </div>
          </Card>
          <Card hoverLift={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FolderKanban size={20} color="#16A34A" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>{stats.total_projects}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Total Projects</div>
              </div>
            </div>
          </Card>
          <Card hoverLift={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={20} color="#EA580C" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>{stats.new_users_this_week}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>New This Week</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0', marginBottom: 20 }}>
        <button onClick={() => setTab('users')} style={tabStyle(tab === 'users')}>
          <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Users ({usersTotal})
        </button>
        <button onClick={() => setTab('projects')} style={tabStyle(tab === 'projects')}>
          <FolderKanban size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Projects ({projectsTotal})
        </button>
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={usersQuery}
              onChange={(e) => handleUserSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {usersLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <Card hoverLift={false}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>User</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Projects</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Joined</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{u.full_name}</div>
                          <div style={{ color: '#64748B', fontSize: 12 }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {u.is_admin && <span style={badgeStyle('#7C3AED', '#F3E8FF')}>Admin</span>}
                            {u.is_disabled ? (
                              <span style={badgeStyle('#DC2626', '#FEE2E2')}>Disabled</span>
                            ) : (
                              <span style={badgeStyle('#16A34A', '#F0FDF4')}>Active</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 12px', color: '#334155' }}>{u.project_count}</td>
                        <td style={{ padding: '12px 12px', color: '#64748B', fontSize: 12 }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                          {u.id !== user?.id && (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => setConfirmAction({
                                  type: u.is_disabled ? 'enable' : 'disable',
                                  id: u.id,
                                  name: u.full_name,
                                })}
                                disabled={actionLoading === u.id}
                                title={u.is_disabled ? 'Enable user' : 'Disable user'}
                                style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #E2E8F0', backgroundColor: '#FFF', color: u.is_disabled ? '#16A34A' : '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                {u.is_disabled ? <UserCheck size={13} /> : <UserX size={13} />}
                                {u.is_disabled ? 'Enable' : 'Disable'}
                              </button>
                              <button
                                onClick={() => handleResetPassword(u)}
                                disabled={actionLoading === u.id}
                                title="Reset password"
                                style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #E2E8F0', backgroundColor: '#FFF', color: '#EA580C', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <KeyRound size={13} />
                                Reset PW
                              </button>
                              <button
                                onClick={() => setConfirmAction({ type: 'toggle-admin', id: u.id, name: u.full_name })}
                                disabled={actionLoading === u.id}
                                title={u.is_admin ? 'Remove admin' : 'Make admin'}
                                style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #E2E8F0', backgroundColor: '#FFF', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                {u.is_admin ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                                {u.is_admin ? 'Remove Admin' : 'Make Admin'}
                              </button>
                            </div>
                          )}
                          {u.id === user?.id && (
                            <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>You</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0 4px', borderTop: '1px solid #F1F5F9' }}>
                  <Button size="sm" variant="secondary" disabled={usersPage <= 1} onClick={() => setUsersPage(p => p - 1)}>Previous</Button>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#64748B' }}>
                    Page {usersPage} of {usersTotalPages}
                  </span>
                  <Button size="sm" variant="secondary" disabled={usersPage >= usersTotalPages} onClick={() => setUsersPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Projects Tab */}
      {tab === 'projects' && (
        <>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search projects by name..."
              value={projectsQuery}
              onChange={(e) => handleProjectSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {projectsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={24} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <Card hoverLift={false}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Project</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Owner</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Members</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Items</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Created</th>
                      <th style={{ textAlign: 'right', padding: '10px 12px', color: '#64748B', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{p.name}</div>
                          {p.description && (
                            <div style={{ color: '#64748B', fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 12px' }}>
                          <div style={{ color: '#334155' }}>{p.owner_name || '-'}</div>
                          <div style={{ color: '#94A3B8', fontSize: 11 }}>{p.owner_email}</div>
                        </td>
                        <td style={{ padding: '12px 12px', color: '#334155' }}>{p.member_count}</td>
                        <td style={{ padding: '12px 12px', color: '#334155' }}>{p.item_count}</td>
                        <td style={{ padding: '12px 12px', color: '#64748B', fontSize: 12 }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => setConfirmAction({ type: 'delete-project', id: p.id, name: p.name })}
                            disabled={actionLoading === p.id}
                            style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {projectsTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0 4px', borderTop: '1px solid #F1F5F9' }}>
                  <Button size="sm" variant="secondary" disabled={projectsPage <= 1} onClick={() => setProjectsPage(p => p - 1)}>Previous</Button>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#64748B' }}>
                    Page {projectsPage} of {projectsTotalPages}
                  </span>
                  <Button size="sm" variant="secondary" disabled={projectsPage >= projectsTotalPages} onClick={() => setProjectsPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#0F172A' }}>
              {confirmAction.type === 'delete-project' ? 'Delete Project' :
               confirmAction.type === 'disable' ? 'Disable User' :
               confirmAction.type === 'enable' ? 'Enable User' :
               confirmAction.type === 'toggle-admin' ? 'Change Admin Status' : 'Confirm'}
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
              {confirmAction.type === 'delete-project'
                ? `Are you sure you want to permanently delete "${confirmAction.name}"? This will delete all backlog items, sprints, and other data. This cannot be undone.`
                : confirmAction.type === 'disable'
                ? `Are you sure you want to disable ${confirmAction.name}? They will not be able to log in.`
                : confirmAction.type === 'enable'
                ? `Re-enable ${confirmAction.name}'s account?`
                : `Change admin status for ${confirmAction.name}?`}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                variant={confirmAction.type === 'delete-project' || confirmAction.type === 'disable' ? 'danger' : 'primary'}
                size="sm"
                onClick={executeConfirmedAction}
                loading={actionLoading !== null}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Temp Password Modal */}
      {tempPassword && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, color: '#0F172A' }}>Password Reset</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#64748B' }}>
              The temporary password has been set. Share it securely with the user.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 20 }}>
              <code style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#0F172A', letterSpacing: '0.05em' }}>{tempPassword.password}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword.password);
                  addToast('success', 'Copied to clipboard');
                }}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', backgroundColor: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}
              >
                <Copy size={13} />
                Copy
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button size="sm" onClick={() => setTempPassword(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
