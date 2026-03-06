import { Avatar } from './Avatar';

interface PresenceAvatarsProps {
  onlineMembers: Map<string, string>;
  currentUserId: string;
  maxVisible?: number;
}

export function PresenceAvatars({
  onlineMembers,
  currentUserId,
  maxVisible = 3,
}: PresenceAvatarsProps) {
  const others = Array.from(onlineMembers.entries()).filter(
    ([id]) => id !== currentUserId
  );

  const visible = others.slice(0, maxVisible);
  const overflow = others.length - maxVisible;

  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {visible.map(([id, name]) => (
        <div
          key={id}
          style={{ position: 'relative' }}
          title={`${name} -- online`}
        >
          <Avatar name={name} size={28} />
          <div
            style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10B981',
              border: '2px solid white',
            }}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#64748B',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
