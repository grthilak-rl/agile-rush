import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { membersApi } from '../../api/client';
import { Avatar } from './Avatar';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  projectId: string;
  placeholder?: string;
  autoFocus?: boolean;
  minRows?: number;
  disabled?: boolean;
  showSubmit?: boolean;
  submitLabel?: string;
  submitting?: boolean;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  projectId,
  placeholder = 'Add a comment... Use @ to mention',
  autoFocus = false,
  minRows = 2,
  disabled = false,
  showSubmit = true,
  submitLabel = 'Send',
  submitting = false,
}: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<
    { id: string; full_name: string }[]
  >([]);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Search members when mention query changes
  useEffect(() => {
    if (mentionQuery === null || !projectId) {
      setMentionResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await membersApi.search(projectId, mentionQuery);
        setMentionResults(
          res.data.map((m: { user_id: string; full_name: string }) => ({
            id: m.user_id,
            full_name: m.full_name,
          }))
        );
        setSelectedIdx(0);
      } catch {
        setMentionResults([]);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [mentionQuery, projectId]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onChange(val);
      const cursor = e.target.selectionStart;
      setMentionCursorPos(cursor);
      const textBefore = val.slice(0, cursor);
      const match = textBefore.match(/@(\w*)$/);
      if (match) setMentionQuery(match[1]);
      else setMentionQuery(null);
    },
    [onChange]
  );

  const insertMention = useCallback(
    (user: { id: string; full_name: string }) => {
      const textBefore = value.slice(0, mentionCursorPos);
      const textAfter = value.slice(mentionCursorPos);
      const atIdx = textBefore.lastIndexOf('@');
      const mention = `@[${user.full_name}](${user.id})`;
      const newText = textBefore.slice(0, atIdx) + mention + ' ' + textAfter;
      onChange(newText);
      setMentionQuery(null);
      setMentionResults([]);
      inputRef.current?.focus();
    },
    [value, mentionCursorPos, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Mention dropdown navigation
      if (mentionQuery !== null && mentionResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIdx((prev) =>
            prev < mentionResults.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIdx((prev) =>
            prev > 0 ? prev - 1 : mentionResults.length - 1
          );
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          insertMention(mentionResults[selectedIdx]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionQuery(null);
          setMentionResults([]);
          return;
        }
      }

      // Cmd/Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSubmit?.();
      }
    },
    [mentionQuery, mentionResults, selectedIdx, insertMention, onSubmit]
  );

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    transition: 'border-color 150ms ease',
    minHeight: minRows * 28,
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: '20px',
  };

  const canSubmit = value.trim().length > 0 && !submitting && !disabled;

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={minRows}
        autoFocus={autoFocus}
        disabled={disabled}
        style={fieldStyle}
      />

      {/* Mention dropdown */}
      {mentionQuery !== null && mentionResults.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            maxHeight: 180,
            overflow: 'auto',
            zIndex: 50,
            marginBottom: 4,
            animation: 'fadeIn 150ms ease forwards',
          }}
        >
          {mentionResults.slice(0, 5).map((u, idx) => (
            <button
              key={u.id}
              onClick={() => insertMention(u)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                width: '100%',
                height: 36,
                border: 'none',
                backgroundColor:
                  idx === selectedIdx ? '#EFF6FF' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                color: '#0F172A',
                textAlign: 'left',
              }}
              onMouseEnter={() => setSelectedIdx(idx)}
            >
              <Avatar name={u.full_name} size={24} />
              {u.full_name}
            </button>
          ))}
        </div>
      )}

      {/* Submit button */}
      {showSubmit && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 6,
          }}
        >
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 12px',
              borderRadius: 6,
              backgroundColor: canSubmit ? '#2563EB' : '#E2E8F0',
              color: canSubmit ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              cursor: canSubmit ? 'pointer' : 'default',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Send size={12} />
            {submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Renders text with @mentions as highlighted spans.
 */
export function MentionText({ content }: { content: string }) {
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          return (
            <span
              key={i}
              style={{
                color: '#2563EB',
                fontWeight: 600,
                backgroundColor: '#EFF6FF',
                padding: '0 3px',
                borderRadius: 3,
              }}
            >
              @{match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
