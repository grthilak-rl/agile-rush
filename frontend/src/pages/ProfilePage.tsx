import { useState, useEffect } from 'react';
import { User, Lock, Save, Bell } from 'lucide-react';
import { usersApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import type { NotificationPreferences } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { ApiKeysPanel } from '../components/settings/ApiKeysPanel';

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

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { addToast } = useToast();

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [savingNotifs, setSavingNotifs] = useState(false);

  useEffect(() => {
    usersApi.getNotificationPreferences().then((res) => setNotifPrefs(res.data)).catch(() => {});
  }, []);

  const handleSaveNotifPrefs = async () => {
    if (!notifPrefs) return;
    setSavingNotifs(true);
    try {
      const res = await usersApi.updateNotificationPreferences(notifPrefs);
      setNotifPrefs(res.data);
      addToast('success', 'Notification preferences saved');
    } catch {
      addToast('error', 'Failed to save notification preferences');
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      addToast('error', 'Name is required');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await usersApi.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      setUser(res.data);
      addToast('success', 'Profile updated');
    } catch {
      addToast('error', 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      addToast('error', 'All password fields are required');
      return;
    }
    if (newPassword.length < 8) {
      addToast('error', 'New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('error', 'New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await usersApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('success', 'Password changed successfully');
    } catch {
      addToast('error', 'Failed to change password. Check your current password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <User size={24} strokeWidth={2} color="#2563EB" />
          Profile Settings
        </h1>
        <p style={{ color: '#64748B', marginTop: 4, fontSize: 15 }}>
          Manage your account details and password
        </p>
      </div>

      {/* Avatar & Profile */}
      <Card hoverLift={false} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar name={user?.full_name || 'U'} size={64} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A' }}>{user?.full_name}</div>
            <div style={{ fontSize: 14, color: '#64748B' }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleSaveProfile}
            loading={savingProfile}
            disabled={!fullName.trim()}
            icon={<Save size={16} strokeWidth={2} />}
          >
            Save Profile
          </Button>
        </div>
      </Card>

      {/* API Keys */}
      <div style={{ marginBottom: 24 }}>
        <ApiKeysPanel />
      </div>

      {/* Notification Preferences */}
      {notifPrefs && (
        <Card hoverLift={false} style={{ marginBottom: 24 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Bell size={18} strokeWidth={2} color="#64748B" />
            Notification Preferences
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', color: '#64748B', fontWeight: 500, fontSize: 12 }}>Category</th>
                <th style={{ textAlign: 'center', padding: '8px 0', color: '#64748B', fontWeight: 500, fontSize: 12, width: 80 }}>In-App</th>
                <th style={{ textAlign: 'center', padding: '8px 0', color: '#64748B', fontWeight: 500, fontSize: 12, width: 80 }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {([
                { key: 'item_assigned' as const, label: 'Item assigned to me' },
                { key: 'mentioned' as const, label: 'Mentioned in a comment' },
                { key: 'sprint_events' as const, label: 'Sprint events' },
                { key: 'due_dates' as const, label: 'Due date reminders' },
                { key: 'comments' as const, label: 'Comments on my items' },
                { key: 'invitations' as const, label: 'Project invitations' },
              ]).map((row) => (
                <tr key={row.key} style={{ borderTop: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 0', color: '#334155' }}>{row.label}</td>
                  <td style={{ textAlign: 'center', padding: '10px 0' }}>
                    <input
                      type="checkbox"
                      checked
                      disabled
                      style={{ accentColor: '#2563EB', width: 16, height: 16, cursor: 'not-allowed', opacity: 0.5 }}
                    />
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 0' }}>
                    <input
                      type="checkbox"
                      checked={notifPrefs[row.key] ?? true}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, [row.key]: e.target.checked })}
                      style={{ accentColor: '#2563EB', width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button
              onClick={handleSaveNotifPrefs}
              loading={savingNotifs}
              icon={<Save size={16} strokeWidth={2} />}
            >
              Save Preferences
            </Button>
          </div>
        </Card>
      )}

      {/* Change Password */}
      <Card hoverLift={false}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Lock size={18} strokeWidth={2} color="#64748B" />
          Change Password
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleChangePassword}
            loading={savingPassword}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          >
            Change Password
          </Button>
        </div>
      </Card>
    </div>
  );
}
