import { useId, useMemo, useState } from 'react';
import { isSameEndpoint, type CapturedRequest } from '../../network/requests';
import { formatTime } from '../format';
import { useResponseJson } from '../hooks/useResponseJson';
import { CompareView } from './CompareView';
import { StatusMessage } from './StatusMessage';

interface ComparePanelProps {
  request: CapturedRequest;
  requests: readonly CapturedRequest[];
}

export function ComparePanel({ request, requests }: ComparePanelProps) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const selectId = useId();
  const { sameEndpoint, others } = useMemo(() => {
    const candidates = requests.filter((candidate) => candidate.id !== request.id);
    return {
      sameEndpoint: candidates.filter((candidate) => isSameEndpoint(candidate, request)),
      others: candidates.filter(
        (candidate) => candidate.isJson && !isSameEndpoint(candidate, request),
      ),
    };
  }, [requests, request]);

  const previousCall =
    sameEndpoint.find((candidate) => candidate.startedAt <= request.startedAt) ??
    sameEndpoint[0] ??
    null;
  const other = requests.find((candidate) => candidate.id === chosenId) ?? previousCall;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-2 py-1">
        <label htmlFor={selectId} className="shrink-0 text-muted">
          Compare with
        </label>
        <select
          id={selectId}
          className="jd-select max-w-[32rem] min-w-0 flex-1 font-mono"
          value={other?.id ?? ''}
          onChange={(event) => setChosenId(event.target.value || null)}
          disabled={sameEndpoint.length + others.length === 0}
        >
          {!other && <option value="">Choose a request…</option>}
          {sameEndpoint.length > 0 && (
            <optgroup label="Same endpoint">{sameEndpoint.map(renderOption)}</optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Other JSON responses">{others.map(renderOption)}</optgroup>
          )}
        </select>
      </div>
      {other ? (
        <ComparePair key={other.id} request={request} other={other} />
      ) : (
        <StatusMessage>
          {sameEndpoint.length + others.length === 0
            ? 'There is no other response to compare with yet.'
            : 'This endpoint has not been called again yet. Trigger it once more, or choose another response above.'}
        </StatusMessage>
      )}
    </>
  );
}

function renderOption(candidate: CapturedRequest) {
  return (
    <option key={candidate.id} value={candidate.id}>
      {formatTime(candidate.startedAt)} · {candidate.method} {candidate.path} ·{' '}
      {candidate.status === 0 ? 'failed' : candidate.status}
    </option>
  );
}

function ComparePair({ request, other }: { request: CapturedRequest; other: CapturedRequest }) {
  const [before, after] =
    other.startedAt <= request.startedAt ? [other, request] : [request, other];
  const beforeState = useResponseJson(before);
  const afterState = useResponseJson(after);

  for (const [state, label] of [
    [beforeState, 'Earlier response'],
    [afterState, 'Later response'],
  ] as const) {
    if (state.kind === 'error') {
      return (
        <StatusMessage tone="error">
          {label}: {state.message}
        </StatusMessage>
      );
    }
  }
  if (beforeState.kind !== 'ready' || afterState.kind !== 'ready') {
    return <StatusMessage>Loading responses…</StatusMessage>;
  }

  return (
    <CompareView
      before={beforeState.data}
      after={afterState.data}
      beforeTime={formatTime(before.startedAt)}
      afterTime={formatTime(after.startedAt)}
    />
  );
}
