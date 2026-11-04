import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { formatBytes } from '../../core';
import { isFailedStatus, type CapturedRequest } from '../../network/requests';
import { ComparePanel } from './ComparePanel';
import { HeadersPanel } from './HeadersPanel';
import { PayloadPanel } from './PayloadPanel';
import { ResponsePanel } from './ResponsePanel';

export type DetailTab = 'response' | 'payload' | 'headers' | 'compare';

const TABS: readonly { value: DetailTab; label: string }[] = [
  { value: 'response', label: 'Response' },
  { value: 'payload', label: 'Payload' },
  { value: 'headers', label: 'Headers' },
  { value: 'compare', label: 'Compare' },
];

interface RequestPanelProps {
  request: CapturedRequest;
  requests: readonly CapturedRequest[];
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

// Tabs stay mounted after the first visit so filters survive switching.
export function RequestPanel({ request, requests, tab, onTabChange }: RequestPanelProps) {
  const [visited, setVisited] = useState<ReadonlySet<DetailTab>>(() => new Set([tab]));
  if (!visited.has(tab)) setVisited(new Set(visited).add(tab));
  const baseId = useId();
  const tabId = (value: DetailTab) => `${baseId}-tab-${value}`;
  const panelId = (value: DetailTab) => `${baseId}-panel-${value}`;
  const hasPayload = request.payload !== null || request.queryParams.length > 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = TABS.findIndex((candidate) => candidate.value === tab);
    const target = TABS[getTargetIndex(event.key, current, TABS.length) ?? -1];
    if (!target) return;
    event.preventDefault();
    onTabChange(target.value);
    document.getElementById(tabId(target.value))?.focus();
  };

  const panels: Record<DetailTab, ReactNode> = {
    response: <ResponsePanel request={request} />,
    payload: <PayloadPanel request={request} />,
    headers: <HeadersPanel request={request} />,
    compare: <ComparePanel request={request} requests={requests} />,
  };

  return (
    <section className="flex h-full min-w-0 flex-col" aria-label="Request details">
      <header className="flex h-8 shrink-0 items-stretch border-b border-line bg-surface-alt">
        <div role="tablist" aria-label="Request details" className="flex shrink-0 items-stretch">
          {TABS.map((candidate) => (
            <button
              key={candidate.value}
              id={tabId(candidate.value)}
              type="button"
              role="tab"
              aria-selected={candidate.value === tab}
              aria-controls={panelId(candidate.value)}
              tabIndex={candidate.value === tab ? 0 : -1}
              onClick={() => onTabChange(candidate.value)}
              onKeyDown={handleKeyDown}
              className={`jd-tab ${candidate.value === 'payload' && !hasPayload ? 'text-muted/60' : ''}`}
              title={candidate.value === 'payload' && !hasPayload ? 'No payload' : undefined}
            >
              {candidate.label}
            </button>
          ))}
        </div>
        <div
          className="flex min-w-0 flex-1 items-center gap-2 border-l border-line px-2 font-mono text-[11px]"
          title={request.url}
        >
          <span className="shrink-0 font-semibold">{request.method}</span>
          <span className="min-w-0 flex-1 truncate">{request.path}</span>
          <span
            className={`shrink-0 tabular-nums ${isFailedStatus(request.status) ? 'text-error' : ''}`}
          >
            {request.status === 0 ? 'failed' : request.status}
          </span>
          {request.size > 0 && (
            <span className="shrink-0 text-muted">{formatBytes(request.size)}</span>
          )}
        </div>
      </header>
      {TABS.filter(({ value }) => visited.has(value)).map(({ value }) => (
        <div
          key={value}
          id={panelId(value)}
          role="tabpanel"
          aria-labelledby={tabId(value)}
          hidden={value !== tab}
          className="flex min-h-0 flex-1 flex-col"
        >
          {panels[value]}
        </div>
      ))}
    </section>
  );
}

function getTargetIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
