import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Check localStorage as fallback — context state can briefly desync
  // during Suspense transitions when lazy-loading new route chunks
  const hasToken = !!localStorage.getItem('token');

  if (isLoading || (!isAuthenticated && hasToken)) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F1F5F9',
        }}
      >
        <Loader2
          size={32}
          color="#2563EB"
          strokeWidth={2}
          style={{ animation: 'spin 1s linear infinite' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}
