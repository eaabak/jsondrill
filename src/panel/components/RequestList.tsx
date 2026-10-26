import { Ban, RotateCw, Search } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { filterRequests, isFailedStatus, type CapturedRequest } from '../../network/requests';
import type { CaptureStatus } from '../hooks/useRequestCapture';
import { StatusMessage } from './StatusMessage';

interface RequestListProps {
  className: string;
  requests: readonly CapturedRequest[];
  status: CaptureStatus;
  selectedId: string | null;
  onSelect: (request: CapturedRequest) => void;
  onClear: () => void;
  onReload: () => void;
}

export function RequestList({
  className,
  requests,
  status,
  selectedId,
  onSelect,
  onClear,
  onReload,
}: RequestListProps) {
  const [text, setText] = useState('');
  const [jsonOnly, setJsonOnly] = useState(true);
  const visible = useMemo(
    () => filterRequests(requests, { text, jsonOnly }),
    [requests, text, jsonOnly],
  );
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const selectedIndex = visible.findIndex((request) => request.id === selectedId);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const targetIndex = getTargetIndex(event.key, selectedIndex, visible.length);
    if (targetIndex === null) return;
    event.preventDefault();
    const target = visible[targetIndex];
    if (!target) return;
    onSelect(target);
    document.getElementById(optionId(targetIndex))?.scrollIntoView({ block: 'nearest' });
  };

  const reloadButton = (
    <button type="button" className="jd-button" onClick={onReload}>
      <RotateCw size={12} aria-hidden />
      Reload page
    </button>
  );

  let content;
  if (status.kind === 'loading') {
    content = <StatusMessage>Reading captured requests…</StatusMessage>;
  } else if (status.kind === 'error') {
    content = <StatusMessage tone="error">{status.message}</StatusMessage>;
  } else if (requests.length === 0) {
    content = (
      <StatusMessage action={reloadButton}>
        No requests captured yet. JSONDrill sees requests made while DevTools is open; reload the
        page to capture earlier ones.
      </StatusMessage>
    );
  } else if (visible.length === 0) {
    content = (
      <StatusMessage>
        No requests match the filter.
        {jsonOnly && ' Clear the JSON option to include other content types.'}
      </StatusMessage>
    );
  } else {
    content = (
      <div
        role="listbox"
        aria-label="Captured requests"
        tabIndex={0}
        aria-activedescendant={selectedIndex >= 0 ? optionId(selectedIndex) : undefined}
        onKeyDown={handleKeyDown}
      >
        {visible.map((request, index) => {
          const isSelected = request.id === selectedId;
          return (
            // Keyboard selection is handled by the listbox through aria-activedescendant.
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
            <div
              key={request.id}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              title={request.url}
              onClick={() => onSelect(request)}
              className={`flex h-[22px] items-center gap-2 border-b border-line/50 px-1.5 font-mono text-[11px] ${
                isSelected ? 'bg-selected' : 'hover:bg-hover'
              }`}
            >
              <span className="w-11 shrink-0 font-semibold">{request.method}</span>
              <span className="min-w-0 flex-1 truncate">{request.path}</span>
              <span
                className={`shrink-0 tabular-nums ${
                  isFailedStatus(request.status) ? 'text-error' : 'text-muted'
                }`}
              >
                {request.status === 0 ? '—' : request.status}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <aside className={className} aria-label="Requests">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-line bg-surface-alt px-1.5">
        <div className="relative min-w-0 flex-1">
          <Search
            size={12}
            className="pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            className="jd-input w-full pl-5"
            placeholder="Filter requests"
            aria-label="Filter requests"
            spellCheck={false}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <label
          className="flex shrink-0 items-center gap-1 text-muted"
          title="Only show JSON content types"
        >
          <input
            type="checkbox"
            checked={jsonOnly}
            onChange={(event) => setJsonOnly(event.target.checked)}
          />
          JSON
        </label>
        <button
          type="button"
          className="jd-icon-button"
          onClick={onReload}
          title="Reload inspected page"
          aria-label="Reload inspected page"
        >
          <RotateCw size={13} aria-hidden />
        </button>
        <button
          type="button"
          className="jd-icon-button"
          onClick={onClear}
          disabled={requests.length === 0}
          title="Clear requests"
          aria-label="Clear requests"
        >
          <Ban size={13} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{content}</div>
      <div className="flex h-6 shrink-0 items-center border-t border-line bg-surface-alt px-1.5 text-muted tabular-nums">
        {visible.length} / {requests.length} requests
      </div>
    </aside>
  );
}

function getTargetIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowDown':
      return Math.min(current + 1, count - 1);
    case 'ArrowUp':
      return Math.max(current - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
