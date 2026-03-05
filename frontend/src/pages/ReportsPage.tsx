import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { reportsApi, sprintsApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge, StatusBadge } from '../components/ui/Badge';
import type { BurndownData, VelocityData, ReportSummary, Sprint } from '../types';

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
  backgroundColor: '#FFFFFF',
  appearance: 'auto' as const,
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: active ? 600 : 400,
  color: active ? '#2563EB' : '#64748B',
  backgroundColor: active ? '#EFF6FF' : 'transparent',
  cursor: 'pointer',
  transition: 'all 150ms ease',
  whiteSpace: 'nowrap',
});

type Tab = 'burndown' | 'velocity' | 'summary';

export default function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('burndown');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  const [burndown, setBurndown] = useState<BurndownData | null>(null);
  const [velocity, setVelocity] = useState<VelocityData | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  const [loadingBurndown, setLoadingBurndown] = useState(false);
  const [loadingVelocity, setLoadingVelocity] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Load sprints for selector
  useEffect(() => {
    if (!projectId) return;
    sprintsApi.list(projectId).then((res) => {
      const sorted = res.data.sort((a, b) => b.sprint_number - a.sprint_number);
      setSprints(sorted);
      const activeSprint = sorted.find((s) => s.status === 'active');
      const latestCompleted = sorted.find((s) => s.status === 'completed');
      if (activeSprint) setSelectedSprintId(activeSprint.id);
      else if (latestCompleted) setSelectedSprintId(latestCompleted.id);
      else if (sorted.length > 0) setSelectedSprintId(sorted[0].id);
    }).catch(() => {});
  }, [projectId]);

  // Load burndown when sprint changes
  useEffect(() => {
    if (!projectId) return;
    setLoadingBurndown(true);
    reportsApi.burndown(projectId, selectedSprintId || undefined)
      .then((res) => setBurndown(res.data))
      .catch(() => addToast('error', 'Failed to load burndown data'))
      .finally(() => setLoadingBurndown(false));
  }, [projectId, selectedSprintId, addToast]);

  // Load velocity on mount
  useEffect(() => {
    if (!projectId) return;
    setLoadingVelocity(true);
    reportsApi.velocity(projectId)
      .then((res) => setVelocity(res.data))
      .catch(() => addToast('error', 'Failed to load velocity data'))
      .finally(() => setLoadingVelocity(false));
  }, [projectId, addToast]);

  // Load summary on mount
  useEffect(() => {
    if (!projectId) return;
    setLoadingSummary(true);
    reportsApi.summary(projectId)
      .then((res) => setSummary(res.data))
      .catch(() => addToast('error', 'Failed to load summary data'))
      .finally(() => setLoadingSummary(false));
  }, [projectId, addToast]);

  const trendIcon = velocity?.trend === 'increasing'
    ? <TrendingUp size={16} color="#10B981" strokeWidth={2} />
    : velocity?.trend === 'decreasing'
      ? <TrendingDown size={16} color="#EF4444" strokeWidth={2} />
      : <Minus size={16} color="#94A3B8" strokeWidth={2} />;

  const trendColor = velocity?.trend === 'increasing' ? '#10B981'
    : velocity?.trend === 'decreasing' ? '#EF4444' : '#94A3B8';

  const trendLabel = velocity?.trend === 'increasing' ? 'Improving'
    : velocity?.trend === 'decreasing' ? 'Declining' : 'Stable';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={24} strokeWidth={2} color="#2563EB" />
            Reports
          </h1>
          <p style={{ color: '#64748B', marginTop: 4, fontSize: 15 }}>
            Track sprint progress, team velocity, and delivery metrics
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto' }}>
        {(['burndown', 'velocity', 'summary'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={tabStyle(activeTab === tab)}
          >
            {tab === 'burndown' ? 'Burndown Chart' : tab === 'velocity' ? 'Velocity' : 'Sprint Summary'}
          </button>
        ))}
      </div>

      {/* Burndown Tab */}
      {activeTab === 'burndown' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              style={inputStyle}
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === 'active' ? '(Active)' : s.status === 'planning' ? '(Planning)' : ''}
                </option>
              ))}
            </select>
            {burndown?.sprint && (
              <StatusBadge status={burndown.sprint.status} />
            )}
          </div>

          {loadingBurndown ? (
            <Card hoverLift={false}>
              <Skeleton height={300} borderRadius={8} />
            </Card>
          ) : !burndown?.sprint || burndown.actual.length === 0 ? (
            <EmptyState
              title="No burndown data"
              description="Start a sprint and track items to see burndown data here."
            />
          ) : (
            <Card hoverLift={false}>
              <h3 style={{ marginBottom: 4 }}>{burndown.sprint.name} Burndown</h3>
              <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>
                {burndown.sprint.start_date} to {burndown.sprint.end_date}
              </p>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart
                  data={burndown.actual.map((a, i) => ({
                    date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    actual: a.remaining_points,
                    ideal: burndown.ideal[i]?.remaining_points ?? 0,
                  }))}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" fontSize={12} tick={{ fill: '#94A3B8' }} />
                  <YAxis fontSize={12} tick={{ fill: '#94A3B8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    stroke="#CBD5E1"
                    strokeDasharray="6 4"
                    strokeWidth={2}
                    dot={false}
                    name="Ideal"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ fill: '#2563EB', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Actual"
                  />
                  <ReferenceLine
                    x={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    stroke="#F97316"
                    strokeDasharray="4 4"
                    label={{ value: 'Today', fill: '#F97316', fontSize: 11 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* Velocity Tab */}
      {activeTab === 'velocity' && (
        <div>
          {loadingVelocity ? (
            <Card hoverLift={false}>
              <Skeleton height={300} borderRadius={8} />
            </Card>
          ) : !velocity || velocity.sprints.length === 0 ? (
            <EmptyState
              title="No velocity data"
              description="Complete at least one sprint to see velocity data."
            />
          ) : (
            <>
              {/* Velocity stats row */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <Card hoverLift={false} style={{ flex: '1 1 200px' }}>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>
                    Average Velocity
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>
                    {velocity.average_velocity} <span style={{ fontSize: 14, fontWeight: 400, color: '#94A3B8' }}>pts/sprint</span>
                  </div>
                </Card>
                <Card hoverLift={false} style={{ flex: '1 1 200px' }}>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>
                    Trend
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {trendIcon}
                    <span style={{ fontSize: 18, fontWeight: 600, color: trendColor }}>{trendLabel}</span>
                  </div>
                </Card>
                <Card hoverLift={false} style={{ flex: '1 1 200px' }}>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>
                    Last Sprint
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>
                    {velocity.sprints[velocity.sprints.length - 1]?.completed_points ?? 0} <span style={{ fontSize: 14, fontWeight: 400, color: '#94A3B8' }}>pts</span>
                  </div>
                </Card>
              </div>

              <Card hoverLift={false}>
                <h3 style={{ marginBottom: 16 }}>Sprint Velocity</h3>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={velocity.sprints.map((s) => ({
                      name: s.name,
                      planned: s.planned_points,
                      completed: s.completed_points,
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" fontSize={12} tick={{ fill: '#94A3B8' }} />
                    <YAxis fontSize={12} tick={{ fill: '#94A3B8' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Bar dataKey="planned" fill="#CBD5E1" name="Planned" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[4, 4, 0, 0]} />
                    <ReferenceLine
                      y={velocity.average_velocity}
                      stroke="#F97316"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={{ value: `Avg: ${velocity.average_velocity}`, fill: '#F97316', fontSize: 11, position: 'right' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div>
          {loadingSummary ? (
            <Card hoverLift={false}>
              <Skeleton height={300} borderRadius={8} />
            </Card>
          ) : !summary || summary.sprints.length === 0 ? (
            <EmptyState
              title="No sprint history"
              description="Complete sprints to see summary data here."
            />
          ) : (
            <>
              {/* Overall stats */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <Card hoverLift={false} style={{ flex: '1 1 160px' }}>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>Sprints Completed</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>{summary.overall.total_sprints_completed}</div>
                </Card>
                <Card hoverLift={false} style={{ flex: '1 1 160px' }}>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>Avg Velocity</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>{summary.overall.average_velocity} <span style={{ fontSize: 14, fontWeight: 400, color: '#94A3B8' }}>pts</span></div>
                </Card>
                <Card hoverLift={false} style={{ flex: '1 1 160px' }}>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>Avg Completion</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>{summary.overall.average_completion_rate}%</div>
                </Card>
                <Card hoverLift={false} style={{ flex: '1 1 160px' }}>
                  <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>Total Delivered</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#0F172A' }}>{summary.overall.total_points_delivered} <span style={{ fontSize: 14, fontWeight: 400, color: '#94A3B8' }}>pts</span></div>
                </Card>
              </div>

              {/* Sprint table */}
              <Card hoverLift={false}>
                <h3 style={{ marginBottom: 16 }}>Sprint History</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                        {['Sprint', 'Status', 'Duration', 'Planned', 'Completed', 'Completion', 'Items', 'Velocity'].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '10px 12px',
                              textAlign: 'left',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#64748B',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.sprints.map((s) => {
                        const rateColor = s.completion_rate >= 80 ? '#10B981' : s.completion_rate >= 50 ? '#F59E0B' : '#EF4444';
                        return (
                          <tr
                            key={s.sprint_number}
                            style={{ borderBottom: '1px solid #F1F5F9' }}
                          >
                            <td style={{ padding: '12px', fontWeight: 600, color: '#0F172A' }}>{s.name}</td>
                            <td style={{ padding: '12px' }}><StatusBadge status={s.status} /></td>
                            <td style={{ padding: '12px', color: '#64748B' }}>{s.duration_days}d</td>
                            <td style={{ padding: '12px', color: '#64748B' }}>{s.planned_points} pts</td>
                            <td style={{ padding: '12px', color: '#0F172A', fontWeight: 500 }}>{s.completed_points} pts</td>
                            <td style={{ padding: '12px' }}>
                              <Badge label={`${s.completion_rate}%`} color={rateColor} />
                            </td>
                            <td style={{ padding: '12px', color: '#64748B' }}>{s.items_completed}/{s.items_total}</td>
                            <td style={{ padding: '12px', color: '#0F172A', fontWeight: 500 }}>{s.velocity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
