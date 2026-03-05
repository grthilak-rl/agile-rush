import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/client';
import type { Notification } from '../../types';

const POLL_INTERVAL = 30000;

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await notificationsApi.count();
      setUnreadCount(res.data.unread);
    } catch {
      // silent
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list({ limit: 20 });
      const data = res.data as unknown as { notifications: Notification[]; total: number };
      setNotifications(data.notifications || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const notif = notifications.find((n) => n.id === id);
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !notif.is_read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) handleMarkRead(notif.id);
    if (notif.project_id && notif.entity_type === 'backlog_item') {
      navigate(`/projects/${notif.project_id}/backlog`);
    } else if (notif.project_id && notif.entity_type === 'sprint') {
      navigate(`/projects/${notif.project_id}/sprints`);
    } else if (notif.project_id) {
      navigate(`/projects/${notif.project_id}`);
    }
    setOpen(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const typeColors: Record<string, string> = {
    invitation: '#8B5CF6',
    item_assigned: '#2563EB',
    item_status_changed: '#F59E0B',
    sprint_started: '#10B981',
    sprint_ending_soon: '#EF4444',
    sprint_completed: '#10B981',
    mentioned: '#2563EB',
    retro_started: '#8B5CF6',
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          cursor: 'pointer',
          color: '#64748B',
          transition: 'all 150ms ease',
          backgroundColor: open ? '#F1F5F9' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          width: 380,
          maxHeight: 480,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          border: '1px solid #E2E8F0',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 150ms ease forwards',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderBottom: '1px solid #F1F5F9',
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: '#2563EB',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <CheckCheck size={14} strokeWidth={2} />
                Mark all read
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                No notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: notif.is_read ? 'transparent' : '#F8FAFC',
                    borderBottom: '1px solid #F8FAFC',
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = notif.is_read ? 'transparent' : '#F8FAFC'; }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      minWidth: 8,
                      borderRadius: '50%',
                      backgroundColor: notif.is_read ? 'transparent' : (typeColors[notif.type] || '#2563EB'),
                      marginTop: 6,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => handleClick(notif)}>
                    <div style={{ fontSize: 13, fontWeight: notif.is_read ? 400 : 600, color: '#0F172A' }}>
                      {notif.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                      {formatTime(notif.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {!notif.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                        style={{ padding: 4, borderRadius: 4, color: '#94A3B8', cursor: 'pointer' }}
                        title="Mark as read"
                      >
                        <Check size={12} strokeWidth={2} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                      style={{ padding: 4, borderRadius: 4, color: '#94A3B8', cursor: 'pointer' }}
                      title="Delete"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
