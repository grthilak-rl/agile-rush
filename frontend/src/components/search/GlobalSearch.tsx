import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FolderKanban, ListChecks, IterationCw, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../api/client';
import type { SearchResults } from '../../types';

const RECENT_KEY = 'agilerush_recent_searches';
const MAX_RECENT = 5;

function getRecentItems(): { label: string; path: string }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentItem(label: string, path: string) {
  const items = getRecentItems().filter((i) => i.path !== path);
  items.unshift({ label, path });
  localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await searchApi.search(q.trim());
      setResults(res.data);
      setSelectedIndex(0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const getAllItems = () => {
    if (!results) return [];
    const items: { label: string; sub: string; path: string; type: string }[] = [];
    results.results.projects.forEach((p) => {
      items.push({ label: p.name, sub: p.snippet, path: `/projects/${p.id}`, type: 'project' });
    });
    results.results.backlog_items.forEach((i) => {
      items.push({
        label: i.title,
        sub: `${i.project_name} - ${i.type} - ${i.status}`,
        path: `/projects/${i.project_id}/backlog`,
        type: 'item',
      });
    });
    results.results.sprints.forEach((s) => {
      items.push({
        label: s.name,
        sub: `${s.project_name} - ${s.status}`,
        path: `/projects/${s.project_id}/sprints`,
        type: 'sprint',
      });
    });
    return items;
  };

  const items = getAllItems();
  const recent = getRecentItems();
  const showRecent = !query.trim() && recent.length > 0;

  const handleSelect = (label: string, path: string) => {
    addRecentItem(label, path);
    navigate(path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = showRecent ? recent : items;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = list[selectedIndex];
      if (item) handleSelect(item.label, item.path);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'project': return <FolderKanban size={16} strokeWidth={1.75} color="#2563EB" />;
      case 'item': return <ListChecks size={16} strokeWidth={1.75} color="#10B981" />;
      case 'sprint': return <IterationCw size={16} strokeWidth={1.75} color="#8B5CF6" />;
      default: return <Search size={16} strokeWidth={1.75} color="#94A3B8" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        animation: 'fadeIn 100ms ease forwards',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'slideIn 150ms ease forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid #F1F5F9',
        }}>
          <Search size={20} strokeWidth={1.75} color="#94A3B8" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, items, sprints..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 16,
              color: '#0F172A',
              backgroundColor: 'transparent',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {query && (
              <button
                onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
                style={{ padding: 4, borderRadius: 4, color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            )}
            <kbd style={{
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: '#F1F5F9',
              color: '#94A3B8',
              fontSize: 11,
              fontFamily: 'inherit',
              border: '1px solid #E2E8F0',
            }}>
              ESC
            </kbd>
          </div>
        </div>

        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              Searching...
            </div>
          )}

          {showRecent && !loading && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '8px 20px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                Recent
              </div>
              {recent.map((item, idx) => (
                <button
                  key={item.path}
                  onClick={() => handleSelect(item.label, item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    backgroundColor: idx === selectedIndex ? '#F1F5F9' : 'transparent',
                    color: '#0F172A',
                    fontSize: 14,
                    transition: 'background-color 100ms ease',
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <Clock size={16} strokeWidth={1.75} color="#94A3B8" />
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {!loading && query.trim() && results && items.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              No results for "{query}"
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              {results!.results.projects.length > 0 && (
                <>
                  <div style={{ padding: '8px 20px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                    Projects
                  </div>
                  {results!.results.projects.map((p, i) => {
                    const globalIdx = i;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelect(p.name, `/projects/${p.id}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '10px 20px',
                          cursor: 'pointer',
                          backgroundColor: globalIdx === selectedIndex ? '#F1F5F9' : 'transparent',
                          transition: 'background-color 100ms ease',
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        {typeIcon('project')}
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>{p.snippet}</div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {results!.results.backlog_items.length > 0 && (
                <>
                  <div style={{ padding: '8px 20px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                    Backlog Items
                  </div>
                  {results!.results.backlog_items.map((item, i) => {
                    const globalIdx = results!.results.projects.length + i;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.title, `/projects/${item.project_id}/backlog`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '10px 20px',
                          cursor: 'pointer',
                          backgroundColor: globalIdx === selectedIndex ? '#F1F5F9' : 'transparent',
                          transition: 'background-color 100ms ease',
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        {typeIcon('item')}
                        <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>
                            {item.project_name} - {item.type} - {item.status.replace('_', ' ')}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {results!.results.sprints.length > 0 && (
                <>
                  <div style={{ padding: '8px 20px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                    Sprints
                  </div>
                  {results!.results.sprints.map((s, i) => {
                    const globalIdx = results!.results.projects.length + results!.results.backlog_items.length + i;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelect(s.name, `/projects/${s.project_id}/sprints`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          padding: '10px 20px',
                          cursor: 'pointer',
                          backgroundColor: globalIdx === selectedIndex ? '#F1F5F9' : 'transparent',
                          transition: 'background-color 100ms ease',
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        {typeIcon('sprint')}
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>{s.project_name} - {s.status}</div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          gap: 16,
          fontSize: 12,
          color: '#94A3B8',
        }}>
          <span><kbd style={{ padding: '1px 4px', borderRadius: 3, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: 11 }}>Up/Down</kbd> Navigate</span>
          <span><kbd style={{ padding: '1px 4px', borderRadius: 3, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: 11 }}>Enter</kbd> Open</span>
          <span><kbd style={{ padding: '1px 4px', borderRadius: 3, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: 11 }}>Esc</kbd> Close</span>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
