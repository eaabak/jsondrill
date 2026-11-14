import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDuration } from '../../core';
import { REPEAT_WINDOW_MS, SLOW_MS, VERY_SLOW_MS } from '../../network/insights';

// Listed in the order "Problems first" sorts them.
const PROBLEMS: readonly { sample: ReactNode; tone: string; label: string }[] = [
  { sample: '—', tone: 'text-error', label: 'Failed: no response (blocked, aborted, offline)' },
  { sample: '500', tone: 'text-error', label: 'Server error (5xx)' },
  { sample: '404', tone: 'text-error', label: 'Client error (4xx)' },
  {
    sample: (
      <>
        <TriangleAlert size={10} aria-hidden />
        200
      </>
    ),
    tone: 'text-error',
    label: 'GraphQL errors inside a successful response',
  },
  {
    sample: formatDuration(VERY_SLOW_MS),
    tone: 'text-error',
    label: `Very slow: ${formatDuration(VERY_SLOW_MS)} or longer`,
  },
  {
    sample: formatDuration(SLOW_MS),
    tone: 'text-warning',
    label: `Slow: ${formatDuration(SLOW_MS)} or longer`,
  },
];

export function RequestLegend({ id }: { id: string }) {
  return (
    <div id={id} className="shrink-0 border-t border-line bg-surface-alt px-2 py-1.5">
      <p className="m-0 mb-1 text-muted">
        What the colors mean. <strong className="font-semibold">Problems first</strong> sorts in
        this order:
      </p>
      <ol className="m-0 list-none p-0">
        {PROBLEMS.map(({ sample, tone, label }, index) => (
          <li key={label} className="flex items-center gap-2 py-px">
            <span className="w-3 shrink-0 text-right text-muted tabular-nums">{index + 1}</span>
            <span
              className={`flex w-10 shrink-0 items-center gap-0.5 font-mono text-[11px] ${tone}`}
            >
              {sample}
            </span>
            <span className="min-w-0">{label}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-1 flex items-center gap-2">
        <span className="w-3 shrink-0" />
        <span className="flex w-10 shrink-0">
          <RepeatBadge count={2} />
        </span>
        <span className="min-w-0">
          Same request sent again within {formatDuration(REPEAT_WINDOW_MS)}
        </span>
      </p>
    </div>
  );
}

export function RepeatBadge({ count, title }: { count: number; title?: string }) {
  return (
    <span
      className="shrink-0 rounded-sm border border-warning/60 px-1 font-mono text-[10px] leading-[14px] text-warning"
      title={title}
    >
      {count}×
    </span>
  );
}
