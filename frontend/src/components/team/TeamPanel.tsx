import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, UserPlus, Crown, Shield, Eye, Trash2, Search, Check, X } from 'lucide-react';
import { membersApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import type { ProjectMember, MemberSearchResult } from '../../types';

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
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('member');
  const [joinRequests, setJoinRequests] = useState<ProjectMember[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canManage = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    loadMembers();
    if (canManage) {
      loadJoinRequests();
    }
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

  const loadJoinRequests = async () => {
    try {
      const res = await membersApi.joinRequests(projectId);
      setJoinRequests(res.data);
    } catch {
      // silently fail
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await membersApi.searchUsersToAdd(projectId, query.trim());
        setSearchResults(res.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [projectId]);

  const handleAddMember = async (userId: string, userName: string) => {
    setAddingUserId(userId);
    try {
      await membersApi.addMember(projectId, { user_id: userId, role: selectedRole });
      addToast('success', `${userName} added to the project`);
      setSearchQuery('');
      setSearchResults([]);
      setShowAddMember(false);
      loadMembers();
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to add member');
    } finally {
      setAddingUserId(null);
    }
  };

  const handleApproveRequest = async (memberId: string, memberName: string) => {
    setProcessingRequestId(memberId);
    try {
      await membersApi.approveRequest(projectId, memberId);
      addToast('success', `${memberName} approved and added to the project`);
      loadJoinRequests();
      loadMembers();
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to approve request');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDenyRequest = async (memberId: string, memberName: string) => {
    setProcessingRequestId(memberId);
    try {
      await membersApi.denyRequest(projectId, memberId);
      addToast('success', `${memberName}'s request denied`);
      loadJoinRequests();
    } catch (err: any) {
      addToast('error', err.response?.data?.detail || 'Failed to deny request');
    } finally {
      setProcessingRequestId(null);
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
            onClick={() => { setShowAddMember(!showAddMember); setSearchQuery(''); setSearchResults([]); }}
          >
            Add Member
          </Button>
        )}
      </div>

      {/* Add Member Search */}
      {showAddMember && (
        <div style={{
          padding: 16,
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #E2E8F0',
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 36 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                autoFocus
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: 120, appearance: 'auto' as const, backgroundColor: '#FFFFFF' }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => setShowAddMember(false)}>
              Cancel
            </Button>
          </div>

          {/* Search Results */}
          {searching && (
            <div style={{ padding: 12, color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>Searching...</div>
          )}
          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <div style={{ padding: 12, color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
              No users found. They need to sign up first.
            </div>
          )}
          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 240, overflowY: 'auto' }}>
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={u.full_name} size={32} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{u.email}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddMember(u.id, u.full_name)}
                    loading={addingUserId === u.id}
                    disabled={addingUserId !== null}
                    icon={<UserPlus size={13} strokeWidth={2} />}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Join Requests */}
      {canManage && joinRequests.length > 0 && (
        <div style={{
          padding: 12,
          backgroundColor: '#FFFBEB',
          borderRadius: 8,
          marginBottom: 16,
          border: '1px solid #FDE68A',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserPlus size={14} />
            Join Requests ({joinRequests.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {joinRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 6,
                  border: '1px solid #FDE68A',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={req.user?.full_name || 'U'} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{req.user?.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>{req.user?.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleApproveRequest(req.id, req.user?.full_name || 'User')}
                    disabled={processingRequestId === req.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 12px', borderRadius: 6, border: 'none',
                      backgroundColor: '#10B981', color: '#FFFFFF',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: processingRequestId === req.id ? 0.6 : 1,
                    }}
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    onClick={() => handleDenyRequest(req.id, req.user?.full_name || 'User')}
                    disabled={processingRequestId === req.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 12px', borderRadius: 6, border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF', color: '#64748B',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: processingRequestId === req.id ? 0.6 : 1,
                    }}
                  >
                    <X size={13} /> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member List */}
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
