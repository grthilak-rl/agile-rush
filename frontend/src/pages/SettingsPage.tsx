import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Settings, Trash2, Save } from 'lucide-react';
import { projectsApi, membersApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { TeamPanel } from '../components/team/TeamPanel';
import type { Project } from '../types';

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#334155',
  marginBottom: 6,
};

export default function SettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>('viewer');

  // Form state
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('contract');
  const [sprintDuration, setSprintDuration] = useState(2);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    projectsApi.get(projectId)
      .then((res) => {
        const p = res.data;
        setProject(p);
        setName(p.name);
        setClientName(p.client_name || '');
        setDescription(p.description || '');
        setProjectType(p.project_type);
        setSprintDuration(p.default_sprint_duration);
      })
      .catch(() => addToast('error', 'Failed to load project settings'))
      .finally(() => setLoading(false));

    // Determine user role
    membersApi.list(projectId).then((res) => {
      const me = res.data.find((m) => m.user_id === user?.id);
      if (me) setUserRole(me.role);
    }).catch(() => {});
  }, [projectId, addToast, user?.id]);

  const handleSave = async () => {
    if (!projectId || !name.trim()) {
      addToast('error', 'Project name is required');
      return;
    }
    setSaving(true);
    try {
      const res = await projectsApi.updateSettings(projectId, {
        name: name.trim(),
        client_name: clientName.trim() || null,
        description: description.trim() || null,
        project_type: projectType as Project['project_type'],
        default_sprint_duration: sprintDuration,
      });
      setProject(res.data);
      addToast('success', 'Project settings saved');
    } catch {
      addToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId || !project) return;
    if (deleteConfirmName !== project.name) {
      addToast('error', 'Project name does not match');
      return;
    }
    setDeleting(true);
    try {
      await projectsApi.delete(projectId, deleteConfirmName);
      addToast('success', `Project "${project.name}" deleted`);
      navigate('/dashboard');
    } catch {
      addToast('error', 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton width="40%" height={28} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={16} style={{ marginBottom: 32 }} />
        <Card hoverLift={false}>
          <Skeleton width="30%" height={20} style={{ marginBottom: 20 }} />
          <Skeleton height={40} style={{ marginBottom: 16 }} />
          <Skeleton height={40} style={{ marginBottom: 16 }} />
          <Skeleton height={40} style={{ marginBottom: 16 }} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={24} strokeWidth={2} color="#2563EB" />
          Project Settings
        </h1>
        <p style={{ color: '#64748B', marginTop: 4, fontSize: 15 }}>
          Manage project configuration and preferences
        </p>
      </div>

      {/* General Settings */}
      <Card hoverLift={false} style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 20 }}>General</h3>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Project Name <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Client Name</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Acme Corp"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const, fontFamily: 'inherit' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Project Type</label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              style={{ ...inputStyle, appearance: 'auto' as const, backgroundColor: '#FFFFFF' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              <option value="contract">Contract</option>
              <option value="full_time">Full-Time</option>
              <option value="one_off">One-Off</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Default Sprint Duration</label>
            <select
              value={sprintDuration}
              onChange={(e) => setSprintDuration(Number(e.target.value))}
              style={{ ...inputStyle, appearance: 'auto' as const, backgroundColor: '#FFFFFF' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              <option value={1}>1 week</option>
              <option value={2}>2 weeks</option>
              <option value={3}>3 weeks</option>
              <option value={4}>4 weeks</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim()}
            icon={<Save size={16} strokeWidth={2} />}
          >
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Sprint Configuration */}
      <Card hoverLift={false} style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>Sprint Configuration</h3>
        <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
          These settings apply to new sprints created in this project.
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <label style={labelStyle}>Sprint Duration</label>
            <div style={{ fontSize: 14, color: '#0F172A' }}>
              {sprintDuration} {sprintDuration === 1 ? 'week' : 'weeks'}
            </div>
          </div>
        </div>
      </Card>

      {/* Team Members */}
      {projectId && (
        <div style={{ marginBottom: 24 }}>
          <TeamPanel projectId={projectId} userRole={userRole} />
        </div>
      )}

      {/* Danger Zone */}
      <Card hoverLift={false} style={{ border: '1px solid #FECACA' }}>
        <h3 style={{ color: '#DC2626', marginBottom: 8 }}>Danger Zone</h3>
        <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
          Permanently delete this project and all associated data including sprints, backlog items, and retrospectives.
          This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <Button
            variant="danger"
            icon={<Trash2 size={16} strokeWidth={2} />}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Project
          </Button>
        ) : (
          <div style={{ padding: 16, backgroundColor: '#FEF2F2', borderRadius: 8 }}>
            <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 500, marginBottom: 12 }}>
              Type <strong>"{project?.name}"</strong> to confirm deletion:
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Enter project name"
              style={{ ...inputStyle, marginBottom: 12, borderColor: '#FECACA' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#EF4444'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#FECACA'; }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={deleting}
                disabled={deleteConfirmName !== project?.name}
              >
                Permanently Delete
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
