import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Check } from 'lucide-react';
import { apiKeysApi } from '../../api/client';
import { useToast } from '../ui/Toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { ApiKeyItem } from '../../types';

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

export function ApiKeysPanel() {
  const { addToast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    try {
      const res = await apiKeysApi.list();
      setKeys(res.data);
    } catch {
      addToast('error', 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const res = await apiKeysApi.create({ name: keyName.trim() });
      setNewKey(res.data.key || null);
      setKeyName('');
      loadKeys();
      addToast('success', 'API key created');
    } catch {
      addToast('error', 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
    try {
      await apiKeysApi.revoke(id);
      addToast('success', 'API key revoked');
      loadKeys();
    } catch {
      addToast('error', 'Failed to revoke API key');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card hoverLift={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Key size={18} strokeWidth={2} color="#64748B" />
          API Keys
        </h3>
        <Button
          size="sm"
          icon={<Plus size={14} strokeWidth={2} />}
          onClick={() => { setShowCreate(true); setNewKey(null); }}
        >
          New Key
        </Button>
      </div>

      <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16 }}>
        Use API keys to access your data via the external API. Keys are shown only once when created.
      </p>

      {newKey && (
        <div style={{
          padding: 16,
          backgroundColor: '#F0FDF4',
          borderRadius: 8,
          border: '1px solid #BBF7D0',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A', marginBottom: 8 }}>
            API key created - copy it now, it won't be shown again
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontFamily: 'monospace',
              color: '#0F172A',
              wordBreak: 'break-all',
              border: '1px solid #E2E8F0',
            }}>
              {newKey}
            </code>
            <button
              onClick={() => handleCopy(newKey)}
              style={{
                padding: 8,
                borderRadius: 6,
                cursor: 'pointer',
                color: copied ? '#16A34A' : '#64748B',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
              }}
              title="Copy to clipboard"
            >
              {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
            </button>
          </div>
        </div>
      )}

      {showCreate && !newKey && (
        <div style={{
          padding: 16,
          backgroundColor: '#F8FAFC',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          marginBottom: 16,
        }}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Key name (e.g., CI/CD Pipeline)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleCreate} loading={creating} disabled={!keyName.trim()} size="sm">
              Create Key
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#94A3B8', fontSize: 14 }}>Loading...</div>
      ) : keys.length === 0 ? (
        <div style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', padding: 20 }}>
          No API keys yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {keys.map((k) => (
            <div
              key={k.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #F1F5F9',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{k.name}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>
                  {k.key_prefix}...
                  {k.last_used_at && (
                    <span style={{ marginLeft: 12, fontFamily: 'inherit' }}>
                      Last used: {new Date(k.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                  {k.created_at && (
                    <span style={{ marginLeft: 12, fontFamily: 'inherit' }}>
                      Created: {new Date(k.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(k.id, k.name)}
                style={{
                  padding: 6,
                  borderRadius: 6,
                  color: '#94A3B8',
                  cursor: 'pointer',
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
                title="Revoke key"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
