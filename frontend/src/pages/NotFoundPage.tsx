import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 800, color: '#E2E8F0', lineHeight: 1, marginBottom: 8 }}>
        404
      </div>
      <h2 style={{ color: '#0F172A', marginBottom: 8 }}>Page not found</h2>
      <p style={{ color: '#64748B', fontSize: 15, maxWidth: 400, marginBottom: 24 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button
        icon={<Home size={16} strokeWidth={2} />}
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </Button>
    </div>
  );
}
