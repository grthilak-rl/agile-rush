import { useState, useEffect } from 'react';
import { Users, UserPlus, Crown, Shield, Eye, Trash2 } from 'lucide-react';
import { membersApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import type { ProjectMember } from '../../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
  transition: 'border-color 150ms ease',
  boxSizing: 'border-box' as const,
};

const roleColors: Record<string, string> = {
  owner: '#8B5CF6',
  admin: '#2563EB',
  member: '#10B981',
  viewer: '#64748B',
};

const roleIcons: Record<string, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Eye,
};

interface TeamPanelProps {
  projectId: string;
  userRole: string;
}

export function TeamPanel({ projectId, userRole }: TeamPanelProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const canManage = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    try {
      const res = await membersApi.list(projectId);
      setMembers(res.data);
    } catch {
      addToast('error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await membersApi.invite(projectId, { email: inviteEmail.trim(), role: inviteRole });
      addToast('success', `Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInvite(false);
      loadMembers();
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await membersApi.updateRole(projectId, memberId, { role: newRole });
      addToast('success', 'Role updated');
      loadMembers();
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this project?`)) return;
    try {
      await membersApi.remove(projectId, memberId);
      addToast('success', `${memberName} removed from project`);
      loadMembers();
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <Card hoverLift={false}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Users size={18} strokeWidth={2} color="#2563EB" />
          Team Members
        </h3>
        <div style={{ color: '#94A3B8', fontSize: 14 }}>Loading...</div>
      </Card>
    );
  }

  return (
    <Card hoverLift={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Users size={18} strokeWidth={2} color="#2563EB" />
          Team Members
          <span style={{ fontSize: 13, fontWeight: 400, color: '#94A3B8' }}>({members.length})</span>
        </h3>
        {canManage && (
          <Button
            size="sm"
            icon={<UserPlus size={14} strokeWidth={2} />}
            onClick={() => setShowInvite(!showInvite)}
          >
            Invite
          </Button>
        )}
      </div>

      {showInvite && (
        <div style={{
          padding: 16,
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #E2E8F0',
        }}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: 120, appearance: 'auto' as const, backgroundColor: '#FFFFFF' }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button onClick={handleInvite} loading={inviting} disabled={!inviteEmail.trim()} size="sm">
              Send Invite
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {members.map((member) => {
          const RoleIcon = roleIcons[member.role] || Users;
          const isCurrentUser = member.user_id === user?.id;
          const canEditMember = canManage && !isCurrentUser && member.role !== 'owner';

          return (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                transition: 'background-color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={member.user?.full_name || 'U'} size={36} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
                    {member.user?.full_name || 'Unknown'}
                    {isCurrentUser && <span style={{ color: '#94A3B8', fontSize: 12, marginLeft: 6 }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>{member.user?.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {member.status === 'pending' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#F59E0B', backgroundColor: '#FFFBEB', padding: '2px 8px', borderRadius: 4 }}>
                    Pending
                  </span>
                )}

                {canEditMember ? (
                  <div style={{ position: 'relative' }}>
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      style={{
                        padding: '4px 24px 4px 8px',
                        borderRadius: 6,
                        border: '1px solid #E2E8F0',
                        fontSize: 12,
                        fontWeight: 600,
                        color: roleColors[member.role],
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        appearance: 'auto' as const,
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                ) : (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: roleColors[member.role],
                    backgroundColor: `${roleColors[member.role]}10`,
                  }}>
                    <RoleIcon size={12} strokeWidth={2} />
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                )}

                {canEditMember && (
                  <button
                    onClick={() => handleRemove(member.id, member.user?.full_name || 'member')}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      color: '#94A3B8',
                      cursor: 'pointer',
                      transition: 'color 150ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
                    title="Remove member"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
