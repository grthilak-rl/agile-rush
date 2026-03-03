import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus,
  Search,
  GripVertical,
  BookOpen,
  ListChecks,
  Bug,
} from 'lucide-react';
import { getProject, type BacklogItem } from '../data/mockData';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, PriorityBadge } from '../components/ui/Badge';
import { PointsBadge } from '../components/ui/PointsBadge';
import { Avatar } from '../components/ui/Avatar';

const typeConfig: Record<string, { icon: typeof BookOpen; color: string; label: string }> = {
  story: { icon: BookOpen, color: '#3B82F6', label: 'Story' },
  task: { icon: ListChecks, color: '#8B5CF6', label: 'Task' },
  bug: { icon: Bug, color: '#F43F5E', label: 'Bug' },
};

type PriorityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low';
type TypeFilter = 'all' | 'story' | 'task' | 'bug';

export function ProductBacklog() {
  const { projectId } = useParams();
  const project = getProject(projectId || '');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  if (!project) return <div>Project not found</div>;

  const filtered = project.backlogItems.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return true;
  });

  const sprintItems = filtered.filter((i) => i.sprintId);
  const backlogItems = filtered.filter((i) => !i.sprintId);
  const totalPoints = project.backlogItems.reduce((sum, i) => sum + i.points, 0);

  const priorityFilters: { key: PriorityFilter; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: '#475569' },
    { key: 'critical', label: 'Critical', color: '#EF4444' },
    { key: 'high', label: 'High', color: '#F97316' },
    { key: 'medium', label: 'Medium', color: '#EAB308' },
    { key: 'low', label: 'Low', color: '#3B82F6' },
  ];

  const typeFilters: { key: TypeFilter; label: string; color: string }[] = [
    { key: 'all', label: 'All Types', color: '#475569' },
    { key: 'story', label: 'Story', color: '#3B82F6' },
    { key: 'task', label: 'Task', color: '#8B5CF6' },
    { key: 'bug', label: 'Bug', color: '#F43F5E' },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1>Product Backlog</h1>
          <Badge label={`${project.backlogItems.length} items`} color="#2563EB" />
          <Badge label={`${totalPoints} points`} color="#8B5CF6" />
        </div>
        <Button icon={<Plus size={16} strokeWidth={2} />}>Add Item</Button>
      </div>

      {/* Filter Bar */}
      <Card hoverLift={false} style={{ marginBottom: 20, padding: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              flex: '1 1 240px',
              maxWidth: 360,
              backgroundColor: '#FFFFFF',
            }}
          >
            <Search size={16} color="#94A3B8" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search backlog items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: '#0F172A',
                width: '100%',
                backgroundColor: 'transparent',
              }}
            />
          </div>

          {/* Priority filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {priorityFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setPriorityFilter(f.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  backgroundColor: priorityFilter === f.key ? `${f.color}1A` : '#F1F5F9',
                  color: priorityFilter === f.key ? f.color : '#64748B',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Type filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {typeFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  backgroundColor: typeFilter === f.key ? `${f.color}1A` : '#F1F5F9',
                  color: typeFilter === f.key ? f.color : '#64748B',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sprint Items */}
      {sprintItems.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              fontSize: 13,
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {project.activeSprint.name} — Sprint Backlog
            <Badge
              label={`${sprintItems.length} items`}
              color="#2563EB"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sprintItems.map((item) => (
              <BacklogRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Unassigned Backlog */}
      {backlogItems.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              fontSize: 13,
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Unassigned Backlog
            <Badge
              label={`${backlogItems.length} items`}
              color="#94A3B8"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {backlogItems.map((item) => (
              <BacklogRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BacklogRow({ item }: { item: BacklogItem }) {
  const [hovered, setHovered] = useState(false);
  const tc = typeConfig[item.type];
  const TypeIcon = tc.icon;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: hovered ? '#FFFFFF' : '#FAFBFC',
        borderRadius: 10,
        borderLeft: `4px solid ${tc.color}`,
        transition: 'all 150ms ease',
        boxShadow: hovered ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
        cursor: 'pointer',
      }}
    >
      {/* Drag handle */}
      <GripVertical size={16} color="#CBD5E1" strokeWidth={1.75} style={{ cursor: 'grab', flexShrink: 0 }} />

      {/* Type icon */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: `${tc.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <TypeIcon size={14} color={tc.color} strokeWidth={2} />
      </div>

      {/* Title & labels */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', marginBottom: 2 }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {item.labels.map((label) => (
            <span
              key={label}
              style={{
                fontSize: 11,
                color: '#64748B',
                padding: '1px 8px',
                backgroundColor: '#F1F5F9',
                borderRadius: 999,
                fontWeight: 500,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Priority */}
      <PriorityBadge priority={item.priority} />

      {/* Story Points */}
      <PointsBadge points={item.points} />

      {/* Assignee */}
      <div style={{ width: 32, height: 32, flexShrink: 0 }}>
        {item.assignee ? (
          <Avatar
            initials={item.assignee.initials}
            color={item.assignee.color}
            size={32}
          />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '2px dashed #CBD5E1',
            }}
          />
        )}
      </div>
    </div>
  );
}
