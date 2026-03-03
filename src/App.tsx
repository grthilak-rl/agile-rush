import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { ProjectOverview } from './pages/ProjectOverview';
import { ProductBacklog } from './pages/ProductBacklog';
import { SprintBoard } from './pages/SprintBoard';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        color: '#94A3B8',
      }}
    >
      <h2 style={{ color: '#334155', marginBottom: 8 }}>{title}</h2>
      <p>This page is coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects/:projectId" element={<ProjectOverview />} />
          <Route path="/projects/:projectId/backlog" element={<ProductBacklog />} />
          <Route path="/projects/:projectId/board" element={<SprintBoard />} />
          <Route path="/projects/:projectId/sprints" element={<PlaceholderPage title="Sprints" />} />
          <Route path="/projects/:projectId/reports" element={<PlaceholderPage title="Reports" />} />
          <Route path="/projects/:projectId/settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
