import { Ban, Circle, Info, RotateCw, Search, TriangleAlert } from 'lucide-react';
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { formatDuration } from '../../core';
import { graphqlLabel } from '../../network/graphql';
import {
  countRepeats,
  REPEAT_WINDOW_MS,
  sortRequests,
  type RequestOrder,
} from '../../network/insights';
import {
  filterRequests,
  isFailedStatus,
  type CapturedRequest,
  type GraphqlErrors,
  type RecordingState,
} from '../../network/requests';
import { getPatternSite } from '../../recording';
import { RecordingPanel } from './RecordingPanel';
import { speedClass } from '../format';
import type { CaptureStatus } from '../hooks/useRequestCapture';
import { RepeatBadge, RequestLegend } from './RequestLegend';
import { StatusMessage } from './StatusMessage';

const ORDERS: readonly { value: RequestOrder; label: string }[] = [
  { value: 'time', label: 'By time' },
  { value: 'slowest', label: 'Slowest first' },
  { value: 'problems', label: 'Problems first' },
];

const BOTTOM_SLACK_PX = 4;

interface RequestListProps {
  className: string;
  style?: CSSProperties;
  requests: readonly CapturedRequest[];
  graphqlErrors: GraphqlErrors;
  status: CaptureStatus;
  selectedId: string | null;
  onSelect: (request: CapturedRequest) => void;
  onClear: () => void;
  onReload: () => void;
  recording: RecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function RequestList({
  className,
  style,
  requests,
  graphqlErrors,
  status,
  selectedId,
  onSelect,
  onClear,
  onReload,
  recording,
  onStartRecording,
  onStopRecording,
}: RequestListProps) {
  const [text, setText] = useState('');
  const [jsonOnly, setJsonOnly] = useState(true);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [order, setOrder] = useState<RequestOrder>('time');
  const [openInfo, setOpenInfo] = useState<'legend' | 'recording' | null>(null);
  const toggleInfo = (info: 'legend' | 'recording') => setOpenInfo(openInfo === info ? null : info);
  const visible = useMemo(
    () =>
      sortRequests(
        filterRequests(requests, { text, jsonOnly, errorsOnly }, graphqlErrors),
        order,
        graphqlErrors,
      ),
    [requests, text, jsonOnly, errorsOnly, order, graphqlErrors],
  );
  const repeats = useMemo(() => countRepeats(requests), [requests]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const followsNewest = useRef(true);

  // New requests land at the bottom; keep them in view unless the user scrolled up.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && order === 'time' && followsNewest.current) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  });
  const listId = useId();
  const legendId = useId();
  const recordingId = useId();
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
        {recording.kind === 'off' &&
          ' To keep them even when DevTools is closed, turn on Record when closed below.'}
      </StatusMessage>
    );
  } else if (visible.length === 0) {
    content = (
      <StatusMessage>
        No requests match the filter.
        {errorsOnly && ' Clear the Errors option to include successful requests.'}
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
          const errors = graphqlErrors.get(request.id);
          const repeatCount = repeats.get(request.id);
          return (
            // Keyboard selection is handled by the listbox through aria-activedescendant.
            // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
            <div
              key={request.id}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              title={errors ? `${request.url}\nGraphQL errors: ${errors.join('; ')}` : request.url}
              onClick={() => onSelect(request)}
              className={`flex h-[22px] items-center gap-2 border-b border-line/50 px-1.5 font-mono text-[11px] ${
                isSelected ? 'bg-selected' : 'hover:bg-hover'
              }`}
            >
              <span className="w-11 shrink-0 font-semibold">{request.method}</span>
              <span className="min-w-0 flex-1 truncate">
                {request.graphql && (
                  <span className="text-syntax-key">{graphqlLabel(request.graphql)} </span>
                )}
                {request.path}
              </span>
              {repeatCount !== undefined && (
                <RepeatBadge
                  count={repeatCount}
                  title={`Sent ${repeatCount} times within ${formatDuration(REPEAT_WINDOW_MS)} of each other with the same URL and body`}
                />
              )}
              <span
                className={`w-12 shrink-0 text-right tabular-nums ${speedClass(request.duration)}`}
              >
                {request.duration === null ? '' : formatDuration(request.duration)}
              </span>
              <span
                className={`flex w-9 shrink-0 items-center justify-end gap-0.5 tabular-nums ${
                  errors || isFailedStatus(request.status) ? 'text-error' : 'text-muted'
                }`}
              >
                {errors && <TriangleAlert size={10} aria-label="GraphQL errors" />}
                {request.status === 0 ? '—' : request.status}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <aside className={className} style={style} aria-label="Requests">
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
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-line bg-surface-alt px-1.5">
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
        <label
          className="flex shrink-0 items-center gap-1 text-muted"
          title="Only show failed requests, HTTP errors (4xx, 5xx) and GraphQL responses with errors"
        >
          <input
            type="checkbox"
            checked={errorsOnly}
            onChange={(event) => setErrorsOnly(event.target.checked)}
          />
          Errors
        </label>
        <select
          className="jd-select ml-auto h-5 min-w-0"
          aria-label="Sort requests"
          title="Sort requests"
          value={order}
          onChange={(event) => {
            const next = ORDERS.find((candidate) => candidate.value === event.target.value);
            if (next) setOrder(next.value);
          }}
        >
          {ORDERS.map((candidate) => (
            <option key={candidate.value} value={candidate.value}>
              {candidate.label}
            </option>
          ))}
        </select>
      </div>
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-auto"
        onScroll={({ currentTarget }) => {
          const gap =
            currentTarget.scrollHeight - currentTarget.scrollTop - currentTarget.clientHeight;
          followsNewest.current = gap < BOTTOM_SLACK_PX;
        }}
      >
        {content}
      </div>
      {openInfo === 'legend' && <RequestLegend id={legendId} />}
      {openInfo === 'recording' && recording.kind !== 'unavailable' && (
        <RecordingPanel
          id={recordingId}
          site={getPatternSite(recording.pattern)}
          isOn={recording.kind === 'on'}
          onStart={onStartRecording}
          onStop={onStopRecording}
          onClose={() => setOpenInfo(null)}
        />
      )}
      <div className="flex h-6 shrink-0 items-center justify-between gap-2 border-t border-line bg-surface-alt px-1.5 text-muted tabular-nums">
        <span className="shrink-0">
          {visible.length} / {requests.length} requests
        </span>
        {recording.kind !== 'unavailable' && (
          <button
            type="button"
            className={`flex min-w-0 items-center gap-1 hover:text-fg ${
              recording.kind === 'on' ? 'text-fg' : ''
            }`}
            aria-expanded={openInfo === 'recording'}
            aria-controls={recordingId}
            onClick={() => toggleInfo('recording')}
          >
            <Circle
              size={9}
              aria-hidden
              className={`shrink-0 ${recording.kind === 'on' ? 'fill-error text-error' : ''}`}
            />
            <span className="truncate">
              {recording.kind === 'on' ? 'Recording this site' : 'Record when closed'}
            </span>
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-1 hover:text-fg"
          aria-expanded={openInfo === 'legend'}
          aria-controls={legendId}
          onClick={() => toggleInfo('legend')}
        >
          <Info size={12} aria-hidden />
          Colors
        </button>
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
