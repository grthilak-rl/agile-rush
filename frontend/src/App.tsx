import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
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
const SprintPlanningPage = lazy(() => import('./pages/SprintPlanningPage'));
const SprintSummaryPage = lazy(() => import('./pages/SprintSummaryPage'));
const RetroPage = lazy(() => import('./pages/RetroPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MyTasksPage = lazy(() => import('./pages/MyTasksPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function CatchAllRedirect() {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/" replace />;
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
    <ErrorBoundary>
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
                <Route path="/projects/:projectId/sprints/:sprintId/plan" element={<SprintPlanningPage />} />
                <Route path="/projects/:projectId/sprints/:sprintId/summary" element={<SprintSummaryPage />} />
                <Route path="/projects/:projectId/sprints/:sprintId/retro" element={<RetroPage />} />
                <Route path="/projects/:projectId/reports" element={<ReportsPage />} />
                <Route path="/projects/:projectId/settings" element={<SettingsPage />} />
                <Route path="/my-tasks" element={<MyTasksPage />} />
                <Route path="/settings/profile" element={<ProfilePage />} />
              </Route>

              {/* 404 inside layout for authenticated users */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Catch all for unauthenticated */}
              <Route path="*" element={<CatchAllRedirect />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
