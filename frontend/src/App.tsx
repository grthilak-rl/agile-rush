import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectOverviewPage = lazy(() => import('./pages/ProjectOverviewPage'));
const BacklogPage = lazy(() => import('./pages/BacklogPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const SprintsPage = lazy(() => import('./pages/SprintsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function CatchAllRedirect() {
  const token = localStorage.getItem('token');
  return <Navigate to={token ? '/dashboard' : '/'} replace />;
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <Loader2 size={28} color="#2563EB" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes with app layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
                <Route path="/projects/:projectId/backlog" element={<BacklogPage />} />
                <Route path="/projects/:projectId/board" element={<BoardPage />} />
                <Route path="/projects/:projectId/sprints" element={<SprintsPage />} />
                <Route path="/projects/:projectId/reports" element={<ReportsPage />} />
                <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
              </Route>

              {/* Catch all — redirect to dashboard if logged in, landing otherwise */}
              <Route path="*" element={<CatchAllRedirect />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
