import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Plus, X, ArrowLeft, CheckSquare, Square, Lightbulb } from 'lucide-react';
import { retroApi } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Skeleton } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import type { RetroItem, RetroResponse } from '../types';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

type ColumnKey = 'went_well' | 'didnt_go_well' | 'action_item';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  icon: typeof ThumbsUp;
  headerBg: string;
  headerColor: string;
  placeholder: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    key: 'went_well',
    label: 'What Went Well',
    icon: ThumbsUp,
    headerBg: '#ECFDF5',
    headerColor: '#10B981',
    placeholder: 'What went well?',
  },
  {
    key: 'didnt_go_well',
    label: "What Didn't Go Well",
    icon: ThumbsDown,
    headerBg: '#FFF1F2',
    headerColor: '#F43F5E',
    placeholder: 'What could be improved?',
  },
  {
    key: 'action_item',
    label: 'Action Items',
    icon: Lightbulb,
    headerBg: '#EFF6FF',
    headerColor: '#2563EB',
    placeholder: 'What should we do differently?',
  },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sortByVotes(items: RetroItem[]): RetroItem[] {
  return [...items].sort((a, b) => b.votes - a.votes);
}

// ---------------------------------------------------------------------------
// RetroCard
// ---------------------------------------------------------------------------

function RetroCard({
  item,
  columnKey,
  onVote,
  onDelete,
  onUpdate,
}: {
  item: RetroItem;
  columnKey: ColumnKey;
  onVote: (id: string) => void;
  onDelete: (item: RetroItem) => void;
  onUpdate: (id: string, data: Partial<RetroItem>) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editing]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== item.content) {
      onUpdate(item.id, { content: trimmed });
    } else {
      setEditContent(item.content);
    }
    setEditing(false);
  }, [editContent, item.content, item.id, onUpdate]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === 'Escape') {
        setEditContent(item.content);
        setEditing(false);
      }
    },
    [handleSaveEdit, item.content]
  );

  const isActionItem = columnKey === 'action_item';
  const isResolved = isActionItem && item.resolved;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => {
        if (!editing) {
          setEditContent(item.content);
          setEditing(true);
        }
      }}
      style={{
        position: 'relative',
        backgroundColor: isResolved ? '#F0FDF4' : '#FFFFFF',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        opacity: isResolved ? 0.8 : 1,
        border: item.carried_over ? '1px dashed #CBD5E1' : '1px solid transparent',
        transition: 'box-shadow 150ms ease',
        ...(hovered ? { boxShadow: '0 3px 8px rgba(0,0,0,0.1)' } : {}),
      }}
    >
      {/* Delete button on hover */}
      {hovered && !editing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: 4,
            border: 'none',
            backgroundColor: '#F1F5F9',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEE2E2';
            e.currentTarget.style.color = '#F43F5E';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F1F5F9';
            e.currentTarget.style.color = '#94A3B8';
          }}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}

      {/* Content area */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Checkbox for action items */}
        {isActionItem && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate(item.id, { resolved: !item.resolved });
            }}
            style={{
              flexShrink: 0,
              marginTop: 1,
              padding: 0,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: item.resolved ? '#10B981' : '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.resolved ? (
              <CheckSquare size={16} strokeWidth={2} />
            ) : (
              <Square size={16} strokeWidth={2} />
            )}
          </button>
        )}

        {/* Text content or edit textarea */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={handleSaveEdit}
              style={{
                width: '100%',
                border: '1px solid #2563EB',
                borderRadius: 6,
                padding: 8,
                fontSize: 14,
                color: '#0F172A',
                resize: 'vertical',
                minHeight: 60,
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: '20px',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <p
              style={{
                fontSize: 14,
                color: '#0F172A',
                lineHeight: '20px',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                textDecoration: isResolved ? 'line-through' : 'none',
              }}
            >
              {item.content}
            </p>
          )}
        </div>
      </div>

      {/* Bottom row: vote + creator */}
      {!editing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVote(item.id);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: item.user_has_voted ? '#EFF6FF' : '#F1F5F9',
              color: item.user_has_voted ? '#2563EB' : '#94A3B8',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!item.user_has_voted) {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.color = '#2563EB';
              }
            }}
            onMouseLeave={(e) => {
              if (!item.user_has_voted) {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.color = '#94A3B8';
              }
            }}
          >
            <ThumbsUp size={12} strokeWidth={2} />
            {item.votes}
          </button>

          {item.creator && (
            <Avatar name={item.creator.full_name} size={24} />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddCardInput
// ---------------------------------------------------------------------------

function AddCardInput({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed) {
          onSubmit(trimmed);
        } else {
          onCancel();
        }
      }
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [value, onSubmit, onCancel]
  );

  return (
    <div style={{ marginBottom: 8 }}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          const trimmed = value.trim();
          if (trimmed) {
            onSubmit(trimmed);
          } else {
            onCancel();
          }
        }}
        placeholder={placeholder}
        style={{
          width: '100%',
          border: '1px solid #2563EB',
          borderRadius: 8,
          padding: 10,
          fontSize: 14,
          color: '#0F172A',
          resize: 'vertical',
          minHeight: 72,
          outline: 'none',
          fontFamily: 'inherit',
          lineHeight: '20px',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RetroColumn
// ---------------------------------------------------------------------------

function RetroColumn({
  config,
  items,
  carriedOverItems,
  sprintNumber,
  onAddCard,
  onVote,
  onDelete,
  onUpdate,
}: {
  config: ColumnConfig;
  items: RetroItem[];
  carriedOverItems?: RetroItem[];
  sprintNumber?: number;
  onAddCard: (column: ColumnKey, content: string) => void;
  onVote: (id: string) => void;
  onDelete: (item: RetroItem) => void;
  onUpdate: (id: string, data: Partial<RetroItem>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const Icon = config.icon;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column header */}
      <div
        style={{
          backgroundColor: config.headerBg,
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} color={config.headerColor} strokeWidth={2} />
          <span style={{ fontSize: 14, fontWeight: 600, color: config.headerColor }}>
            {config.label}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: config.headerColor,
              backgroundColor: `${config.headerColor}18`,
              borderRadius: 10,
              padding: '1px 8px',
              minWidth: 20,
              textAlign: 'center',
            }}
          >
            {items.length}
          </span>
        </div>
      </div>

      {/* Add card button / input */}
      {adding ? (
        <AddCardInput
          placeholder={config.placeholder}
          onSubmit={(content) => {
            onAddCard(config.key, content);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '8px 12px',
            marginBottom: 8,
            borderRadius: 8,
            border: '1px dashed #CBD5E1',
            backgroundColor: 'transparent',
            color: '#64748B',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = config.headerColor;
            e.currentTarget.style.color = config.headerColor;
            e.currentTarget.style.backgroundColor = config.headerBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.color = '#64748B';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Plus size={14} strokeWidth={2} />
          Add card
        </button>
      )}

      {/* Cards */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.length === 0 && !adding && (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: '#94A3B8',
              fontSize: 13,
              lineHeight: '20px',
            }}
          >
            No items yet. Click &quot;+ Add card&quot; to share your thoughts.
          </div>
        )}
        {sortByVotes(items).map((item) => (
          <RetroCard
            key={item.id}
            item={item}
            columnKey={config.key}
            onVote={onVote}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}

        {/* Carried over action items */}
        {carriedOverItems && carriedOverItems.length > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                margin: '16px 0 8px',
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#94A3B8',
                  whiteSpace: 'nowrap',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Carried Over from Sprint {sprintNumber != null ? sprintNumber - 1 : '?'}
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            </div>
            {sortByVotes(carriedOverItems).map((item) => (
              <RetroCard
                key={item.id}
                item={item}
                columnKey="action_item"
                onVote={onVote}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function RetroSkeleton() {
  return (
    <div>
      {/* Header skeleton */}
      <div
        style={{
          backgroundColor: '#F1F5F9',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <Skeleton width="40%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="30%" height={14} />
      </div>
      {/* Column skeletons */}
      <div style={{ display: 'flex', gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1 }}>
            <Skeleton width="100%" height={44} borderRadius={10} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={32} borderRadius={8} style={{ marginBottom: 8 }} />
            {[0, 1, 2].map((j) => (
              <Skeleton
                key={j}
                width="100%"
                height={80}
                borderRadius={10}
                style={{ marginBottom: 8 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile Tab Bar
// ---------------------------------------------------------------------------

function MobileTabBar({
  columns,
  items,
  activeTab,
  onTabChange,
}: {
  columns: ColumnConfig[];
  items: Record<ColumnKey, RetroItem[]>;
  activeTab: ColumnKey;
  onTabChange: (key: ColumnKey) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 3,
        marginBottom: 16,
      }}
    >
      {columns.map((col) => {
        const isActive = activeTab === col.key;
        return (
          <button
            key={col.key}
            onClick={() => onTabChange(col.key)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
              color: isActive ? col.headerColor : '#64748B',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            {col.label}
            <span
              style={{
                fontSize: 11,
                backgroundColor: isActive ? `${col.headerColor}18` : '#E2E8F0',
                color: isActive ? col.headerColor : '#94A3B8',
                borderRadius: 8,
                padding: '0 6px',
                minWidth: 18,
                textAlign: 'center',
              }}
            >
              {items[col.key]?.length || 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RetroPage (main component)
// ---------------------------------------------------------------------------

export default function RetroPage() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [retroData, setRetroData] = useState<RetroResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RetroItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<ColumnKey>('went_well');
  const [isMobile, setIsMobile] = useState(false);

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load retro data
  const loadRetro = useCallback(async () => {
    if (!projectId || !sprintId) return;
    setLoading(true);
    try {
      const res = await retroApi.get(projectId, sprintId);
      setRetroData(res.data);
    } catch {
      addToast('error', 'Failed to load retrospective');
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintId, addToast]);

  useEffect(() => {
    loadRetro();
  }, [loadRetro]);

  // --- Handlers ---

  const handleAddCard = useCallback(
    async (column: ColumnKey, content: string) => {
      if (!projectId || !sprintId) return;
      try {
        const res = await retroApi.create(projectId, sprintId, { content, column });
        setRetroData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [column]: [...prev[column], res.data],
          };
        });
        addToast('success', 'Card added');
      } catch {
        addToast('error', 'Failed to add card');
      }
    },
    [projectId, sprintId, addToast]
  );

  const handleVote = useCallback(
    async (retroId: string) => {
      if (!projectId || !sprintId) return;

      // Optimistic update
      setRetroData((prev) => {
        if (!prev) return prev;
        const updateItems = (items: RetroItem[]) =>
          items.map((item) => {
            if (item.id !== retroId) return item;
            const hasVoted = item.user_has_voted;
            return {
              ...item,
              votes: hasVoted ? item.votes - 1 : item.votes + 1,
              user_has_voted: !hasVoted,
            };
          });
        return {
          ...prev,
          went_well: updateItems(prev.went_well),
          didnt_go_well: updateItems(prev.didnt_go_well),
          action_item: updateItems(prev.action_item),
          carried_over_actions: updateItems(prev.carried_over_actions),
        };
      });

      try {
        await retroApi.vote(projectId, sprintId, retroId);
      } catch {
        // Revert on error
        loadRetro();
        addToast('error', 'Failed to vote');
      }
    },
    [projectId, sprintId, loadRetro, addToast]
  );

  const handleUpdate = useCallback(
    async (retroId: string, data: Partial<RetroItem>) => {
      if (!projectId || !sprintId) return;
      try {
        const res = await retroApi.update(projectId, sprintId, retroId, data);
        setRetroData((prev) => {
          if (!prev) return prev;
          const updateItems = (items: RetroItem[]) =>
            items.map((item) => (item.id === retroId ? { ...item, ...res.data } : item));
          return {
            ...prev,
            went_well: updateItems(prev.went_well),
            didnt_go_well: updateItems(prev.didnt_go_well),
            action_item: updateItems(prev.action_item),
            carried_over_actions: updateItems(prev.carried_over_actions),
          };
        });
      } catch {
        addToast('error', 'Failed to update card');
      }
    },
    [projectId, sprintId, addToast]
  );

  const handleDelete = useCallback(async () => {
    if (!projectId || !sprintId || !deleteTarget) return;
    setDeleting(true);
    try {
      await retroApi.delete(projectId, sprintId, deleteTarget.id);
      setRetroData((prev) => {
        if (!prev) return prev;
        const filterItems = (items: RetroItem[]) =>
          items.filter((item) => item.id !== deleteTarget.id);
        return {
          ...prev,
          went_well: filterItems(prev.went_well),
          didnt_go_well: filterItems(prev.didnt_go_well),
          action_item: filterItems(prev.action_item),
          carried_over_actions: filterItems(prev.carried_over_actions),
        };
      });
      addToast('success', 'Card deleted');
    } catch {
      addToast('error', 'Failed to delete card');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [projectId, sprintId, deleteTarget, addToast]);

  // --- Render ---

  if (loading) {
    return (
      <div style={{ padding: '32px 0' }}>
        <RetroSkeleton />
      </div>
    );
  }

  const sprint = retroData?.sprint ?? null;
  const wentWell = retroData?.went_well ?? [];
  const didntGoWell = retroData?.didnt_go_well ?? [];
  const actionItems = retroData?.action_item ?? [];
  const carriedOver = retroData?.carried_over_actions ?? [];

  const itemsByColumn: Record<ColumnKey, RetroItem[]> = {
    went_well: wentWell,
    didnt_go_well: didntGoWell,
    action_item: actionItems,
  };

  return (
    <div style={{ padding: '32px 0' }}>
      {/* Sprint Header Banner */}
      <div
        style={{
          backgroundColor: '#F1F5F9',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(`/projects/${projectId}/sprints`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                color: '#64748B',
                transition: 'all 150ms ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563EB';
                e.currentTarget.style.color = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.color = '#64748B';
              }}
              title="Back to Sprints"
            >
              <ArrowLeft size={16} strokeWidth={2} />
            </button>
            <div>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                  lineHeight: '28px',
                }}
              >
                {sprint?.name || 'Sprint'} Retrospective
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 4,
                  flexWrap: 'wrap',
                }}
              >
                {sprint?.start_date && sprint?.end_date && (
                  <span style={{ fontSize: 13, color: '#64748B' }}>
                    {formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
                  </span>
                )}
                {sprint && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {sprint.points_completed}/{sprint.points_total} pts
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate(`/projects/${projectId}/sprints/${sprintId}/summary`)
            }
          >
            View Summary
          </Button>
        </div>

        {sprint?.goal && (
          <p
            style={{
              fontSize: 13,
              color: '#334155',
              margin: 0,
              marginTop: 4,
              lineHeight: '20px',
              fontStyle: 'italic',
            }}
          >
            Goal: {sprint.goal}
          </p>
        )}
      </div>

      {/* Mobile Tab Bar */}
      {isMobile && (
        <MobileTabBar
          columns={COLUMNS}
          items={itemsByColumn}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Three Column Board */}
      {isMobile ? (
        // Mobile: single column at a time
        <div>
          {COLUMNS.filter((col) => col.key === activeTab).map((col) => (
            <RetroColumn
              key={col.key}
              config={col}
              items={itemsByColumn[col.key]}
              carriedOverItems={col.key === 'action_item' ? carriedOver : undefined}
              sprintNumber={sprint?.sprint_number}
              onAddCard={handleAddCard}
              onVote={handleVote}
              onDelete={setDeleteTarget}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      ) : (
        // Desktop: three columns side by side
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {COLUMNS.map((col) => (
            <RetroColumn
              key={col.key}
              config={col}
              items={itemsByColumn[col.key]}
              carriedOverItems={col.key === 'action_item' ? carriedOver : undefined}
              sprintNumber={sprint?.sprint_number}
              onAddCard={handleAddCard}
              onVote={handleVote}
              onDelete={setDeleteTarget}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Card"
        message="Are you sure you want to delete this retro card? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
