import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  FolderKanban,
  Settings,
  Plus,
  Mail,
  Crown,
  Shield,
  UserMinus,
  Save,
  Trash2,
} from 'lucide-react';
import { organizationsApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { SlidePanel } from '../components/ui/SlidePanel';
import type { OrganizationDetail, OrgMemberItem, Project } from '../types';

type TabKey = 'projects' | 'members' | 'settings';

const projectTypeLabels: Record<string, string> = {
  contract: 'Contract',
  full_time: 'Full-Time',
  one_off: 'One-Off',
};

const projectTypeColors: Record<string, string> = {
  contract: '#2563EB',
  full_time: '#8B5CF6',
  one_off: '#F97316',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
  transition: 'border-color 150ms ease',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#334155',
  marginBottom: 6,
};

const roleColors: Record<string, string> = {
  owner: '#F97316',
  admin: '#8B5CF6',
  member: '#2563EB',
};

export default function OrgPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [members, setMembers] = useState<OrgMemberItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('projects');

  // Invite state
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  // Create project state
  const [projectPanelOpen, setProjectPanelOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectClient, setProjectClient] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectType, setProjectType] = useState('contract');
  const [projectDuration, setProjectDuration] = useState(2);
  const [creatingProject, setCreatingProject] = useState(false);

  // Settings state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    organizationsApi.getBySlug(slug)
      .then((res) => {
        setOrg(res.data);
        setEditName(res.data.name);
        setEditDescription(res.data.description || '');
        return res.data.id;
      })
      .then((orgId) => {
        return Promise.all([
          organizationsApi.listMembers(orgId),
          organizationsApi.listProjects(orgId),
        ]);
      })
      .then(([membersRes, projectsRes]) => {
        setMembers(membersRes.data);
        setProjects(projectsRes.data);
      })
      .catch(() => addToast('error', 'Failed to load organization'))
      .finally(() => setLoading(false));
  }, [slug, addToast]);

  const myRole = org?.my_role;
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  const handleInvite = async () => {
    if (!org || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await organizationsApi.inviteMember(org.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setMembers((prev) => [...prev, res.data.member]);
      setInvitePanelOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      addToast('success', 'Invitation sent');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to invite';
      addToast('error', msg);
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!org) return;
    try {
      await organizationsApi.removeMember(org.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      addToast('success', 'Member removed');
    } catch {
      addToast('error', 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!org) return;
    try {
      const res = await organizationsApi.updateMemberRole(org.id, memberId, { role: newRole });
      setMembers((prev) => prev.map((m) => m.id === memberId ? res.data : m));
      addToast('success', 'Role updated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to update role';
      addToast('error', msg);
    }
  };

  const handleCreateProject = async () => {
    if (!org || !projectName.trim()) return;
    setCreatingProject(true);
    try {
      const res = await organizationsApi.createProject(org.id, {
        name: projectName.trim(),
        client_name: projectClient.trim() || undefined,
        description: projectDesc.trim() || undefined,
        project_type: projectType,
        default_sprint_duration: projectDuration,
      });
      setProjects((prev) => [...prev, res.data]);
      setProjectPanelOpen(false);
      setProjectName('');
      setProjectClient('');
      setProjectDesc('');
      setProjectType('contract');
      setProjectDuration(2);
      addToast('success', `Project "${res.data.name}" created`);
    } catch {
      addToast('error', 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!org || !editName.trim()) return;
    setSavingSettings(true);
    try {
      const res = await organizationsApi.update(org.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setOrg((prev) => prev ? { ...prev, name: res.data.name, slug: res.data.slug, description: res.data.description } : prev);
      addToast('success', 'Organization settings saved');
      if (res.data.slug !== slug) {
        navigate(`/org/${res.data.slug}`, { replace: true });
      }
    } catch {
      addToast('error', 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDelete = async () => {
    if (!org || deleteConfirmName !== org.name) return;
    setDeleting(true);
    try {
      await organizationsApi.delete(org.id, { confirm_name: deleteConfirmName, transfer_projects: true });
      addToast('success', 'Organization deleted');
      navigate('/dashboard');
    } catch {
      addToast('error', 'Failed to delete organization');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton width="40%" height={28} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={16} style={{ marginBottom: 32 }} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (!org) {
    return <EmptyState icon="" title="Organization not found" description="This organization doesn't exist or you don't have access." />;
  }

  const tabs: { key: TabKey; label: string; icon: typeof FolderKanban }[] = [
    { key: 'projects', label: 'Projects', icon: FolderKanban },
    { key: 'members', label: 'Members', icon: Users },
    ...(isAdmin ? [{ key: 'settings' as TabKey, label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #2563EB, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={24} color="#FFFFFF" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ marginBottom: 2 }}>{org.name}</h1>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              {org.member_count} {org.member_count === 1 ? 'member' : 'members'} &middot; {org.project_count} {org.project_count === 1 ? 'project' : 'projects'}
              {org.description && <span> &middot; {org.description}</span>}
            </div>
          </div>
        </div>
        <Badge label={myRole === 'owner' ? 'Owner' : myRole === 'admin' ? 'Admin' : 'Member'} color={roleColors[myRole || 'member']} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E2E8F0', marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', fontSize: 14, fontWeight: 500,
              color: activeTab === tab.key ? '#2563EB' : '#64748B',
              borderBottom: activeTab === tab.key ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: -2, cursor: 'pointer',
              backgroundColor: 'transparent',
              transition: 'all 150ms ease',
            }}
          >
            <tab.icon size={16} strokeWidth={1.75} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Projects</h2>
            {isAdmin && (
              <Button icon={<Plus size={16} strokeWidth={2} />} onClick={() => setProjectPanelOpen(true)}>
                New Project
              </Button>
            )}
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon=""
              title="No projects yet"
              description={isAdmin ? 'Create the first project for this organization' : 'No projects in this organization yet'}
              action={isAdmin ? { label: 'New Project', onClick: () => setProjectPanelOpen(true), icon: <Plus size={16} strokeWidth={2} /> } : undefined}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
              {projects.map((project) => (
                <Card key={project.id} borderLeft={project.color} onClick={() => navigate(`/projects/${project.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ marginBottom: 2 }}>{project.name}</h3>
                      <div style={{ fontSize: 13, color: '#64748B' }}>{project.client_name || 'No client'}</div>
                    </div>
                    <Badge label={projectTypeLabels[project.project_type] || project.project_type} color={projectTypeColors[project.project_type] || '#94A3B8'} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, fontSize: 13, color: '#475569' }}>
                    {project.active_sprint_name ? (
                      <span><strong style={{ color: '#0F172A' }}>{project.active_sprint_name}</strong> active</span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>No active sprint</span>
                    )}
                    <span>{project.completed_items}/{project.total_items} items</span>
                  </div>
                  <ProgressBar value={project.progress_percentage} showLabel />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Members ({members.filter((m) => m.status === 'active').length})</h2>
            {isAdmin && (
              <Button icon={<Mail size={16} strokeWidth={2} />} onClick={() => setInvitePanelOpen(true)}>
                Invite Member
              </Button>
            )}
          </div>

          <Card hoverLift={false}>
            {members.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748B' }}>No members yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {members.map((member) => (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderBottom: '1px solid #F1F5F9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        backgroundColor: '#E2E8F0', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 600, color: '#334155',
                        overflow: 'hidden',
                      }}>
                        {member.user?.avatar_url ? (
                          <img src={member.user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (member.user?.full_name || member.email || '?')[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
                          {member.user?.full_name || member.email || 'Unknown'}
                          {member.user_id === user?.id && <span style={{ fontSize: 12, color: '#64748B', marginLeft: 6 }}>(you)</span>}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                          {member.user?.email || member.email}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {member.status === 'pending' && (
                        <Badge label="Pending" color="#F97316" />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {member.role === 'owner' && <Crown size={14} color="#F97316" strokeWidth={2} />}
                        {member.role === 'admin' && <Shield size={14} color="#8B5CF6" strokeWidth={2} />}
                        {isAdmin && member.role !== 'owner' && member.user_id !== user?.id ? (
                          <div style={{ position: 'relative' }}>
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              style={{
                                padding: '4px 8px', borderRadius: 6, fontSize: 12,
                                fontWeight: 500, border: '1px solid #E2E8F0',
                                color: roleColors[member.role] || '#64748B',
                                backgroundColor: 'transparent', cursor: 'pointer',
                                appearance: 'auto' as const,
                              }}
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 500, color: roleColors[member.role] || '#64748B', textTransform: 'capitalize' }}>
                            {member.role}
                          </span>
                        )}
                      </div>
                      {isAdmin && member.role !== 'owner' && member.user_id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          style={{ padding: 4, borderRadius: 6, cursor: 'pointer', color: '#94A3B8', backgroundColor: 'transparent' }}
                          title="Remove member"
                        >
                          <UserMinus size={16} strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && isAdmin && (
        <div>
          <Card hoverLift={false} style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 20 }}>General</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Organization Name <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const, fontFamily: 'inherit' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleSaveSettings} loading={savingSettings} disabled={!editName.trim()} icon={<Save size={16} strokeWidth={2} />}>
                Save Changes
              </Button>
            </div>
          </Card>

          <Card hoverLift={false} style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 8 }}>Plan</h3>
            <div style={{ fontSize: 14, color: '#475569' }}>
              Current plan: <strong style={{ textTransform: 'capitalize' }}>{org.plan}</strong> &middot; {org.member_count}/{org.max_members} members
            </div>
          </Card>

          {myRole === 'owner' && (
            <Card hoverLift={false} style={{ border: '1px solid #FECACA' }}>
              <h3 style={{ color: '#DC2626', marginBottom: 8 }}>Danger Zone</h3>
              <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
                Permanently delete this organization. Projects will be transferred to your personal workspace.
              </p>

              {!showDeleteConfirm ? (
                <Button variant="danger" icon={<Trash2 size={16} strokeWidth={2} />} onClick={() => setShowDeleteConfirm(true)}>
                  Delete Organization
                </Button>
              ) : (
                <div style={{ padding: 16, backgroundColor: '#FEF2F2', borderRadius: 8 }}>
                  <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 500, marginBottom: 12 }}>
                    Type <strong>"{org.name}"</strong> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder="Enter organization name"
                    style={{ ...inputStyle, marginBottom: 12, borderColor: '#FECACA' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={deleteConfirmName !== org.name}>
                      Permanently Delete
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Invite Member Panel */}
      <SlidePanel isOpen={invitePanelOpen} onClose={() => setInvitePanelOpen(false)} title="Invite Member" width={400}>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email Address <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' as const, backgroundColor: '#FFFFFF' }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button onClick={handleInvite} loading={inviting} disabled={!inviteEmail.trim()} style={{ width: '100%', justifyContent: 'center' }}>
            Send Invitation
          </Button>
        </div>
      </SlidePanel>

      {/* Create Project Panel */}
      <SlidePanel isOpen={projectPanelOpen} onClose={() => setProjectPanelOpen(false)} title="Create Project" width={420}>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project Name <span style={{ color: '#EF4444' }}>*</span></label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Mobile App Redesign" style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Client Name</label>
            <input type="text" value={projectClient} onChange={(e) => setProjectClient(e.target.value)} placeholder="e.g. Acme Corp" style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <textarea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="Brief description..." rows={3}
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const, fontFamily: 'inherit' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project Type</label>
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' as const, backgroundColor: '#FFFFFF' }}>
              <option value="contract">Contract</option>
              <option value="full_time">Full-Time</option>
              <option value="one_off">One-Off</option>
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Sprint Duration</label>
            <select value={projectDuration} onChange={(e) => setProjectDuration(Number(e.target.value))}
              style={{ ...inputStyle, appearance: 'auto' as const, backgroundColor: '#FFFFFF' }}>
              <option value={1}>1 week</option>
              <option value={2}>2 weeks</option>
              <option value={3}>3 weeks</option>
              <option value={4}>4 weeks</option>
            </select>
          </div>
          <Button onClick={handleCreateProject} loading={creatingProject} disabled={!projectName.trim()} style={{ width: '100%', justifyContent: 'center' }}>
            Create Project
          </Button>
        </div>
      </SlidePanel>
    </div>
  );
}
