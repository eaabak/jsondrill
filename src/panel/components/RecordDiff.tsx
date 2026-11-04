import { UnfoldVertical } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  diffLines,
  foldUnchangedLines,
  MAX_DIFF_LINES,
  toSplitRows,
  type DiffLine,
  type LineKind,
  type LineValueType,
} from '../../core';

export type DiffMode = 'unified' | 'split';

interface RecordDiffProps {
  header: ReactNode;
  before: unknown;
  after: unknown;
  mode: DiffMode;
}

const SIGNS: Record<LineKind, string> = { same: '', removed: '−', added: '+' };
const ROW_CLASSES: Record<LineKind, { row: string; gutter: string; emphasis: string }> = {
  same: { row: '', gutter: 'text-muted', emphasis: '' },
  removed: { row: 'bg-diff-del', gutter: 'bg-diff-del-gutter', emphasis: 'bg-diff-del-strong' },
  added: { row: 'bg-diff-add', gutter: 'bg-diff-add-gutter', emphasis: 'bg-diff-add-strong' },
};
const VALUE_CLASSES: Record<LineValueType, string> = {
  string: 'text-syntax-string',
  number: 'text-syntax-number',
  literal: 'text-syntax-keyword',
  punctuation: '',
};
const UNIFIED_GRID = 'grid grid-cols-[2.5rem_2.5rem_1.25rem_minmax(0,1fr)]';
const SPLIT_GRID = 'grid grid-cols-[2.5rem_1.25rem_minmax(0,1fr)_2.5rem_1.25rem_minmax(0,1fr)]';

export function RecordDiff({ header, before, after, mode }: RecordDiffProps) {
  const { lines, truncated } = useMemo(() => diffLines(before, after), [before, after]);
  const segments = useMemo(() => foldUnchangedLines(lines), [lines]);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());

  return (
    <section className="mx-2 my-2 overflow-hidden rounded-[3px] border border-line">
      <header className="flex items-center gap-2 border-b border-line bg-surface-alt px-2 py-1">
        {header}
      </header>
      {segments.map((segment, segmentIndex) => {
        if (segment.kind === 'fold' && !expanded.has(segmentIndex)) {
          return (
            <button
              key={segmentIndex}
              type="button"
              className="flex w-full items-center gap-2 bg-diff-fold px-2 py-0.5 text-left text-muted hover:text-fg"
              onClick={() => setExpanded((current) => new Set(current).add(segmentIndex))}
            >
              <UnfoldVertical size={12} aria-hidden />
              Show {segment.lines.length} unchanged lines
            </button>
          );
        }
        return mode === 'unified'
          ? segment.lines.map((line, index) => (
              <UnifiedRow key={`${segmentIndex}:${index}`} line={line} />
            ))
          : toSplitRows(segment.lines).map((row, index) => (
              <div key={`${segmentIndex}:${index}`} className={SPLIT_GRID}>
                <SplitHalf line={row.before} side="before" />
                <SplitHalf line={row.after} side="after" />
              </div>
            ));
      })}
      {truncated && (
        <p className="m-0 border-t border-line px-2 py-1 font-sans text-xs text-muted">
          Only the first {MAX_DIFF_LINES.toLocaleString('en-US')} lines are shown.
        </p>
      )}
    </section>
  );
}

function UnifiedRow({ line }: { line: DiffLine }) {
  const classes = ROW_CLASSES[line.kind];
  return (
    <div className={`${UNIFIED_GRID} ${classes.row}`}>
      <LineNumber value={line.beforeLine} className={classes.gutter} />
      <LineNumber value={line.afterLine} className={classes.gutter} />
      <span
        className="text-center select-none"
        aria-label={line.kind === 'same' ? undefined : line.kind}
      >
        {SIGNS[line.kind]}
      </span>
      <LineCode line={line} comma={line.comma} />
    </div>
  );
}

function SplitHalf({ line, side }: { line: DiffLine | null; side: 'before' | 'after' }) {
  const border = side === 'after' ? 'border-l border-line' : '';
  if (!line) return <span className={`col-span-3 bg-surface-alt ${border}`} />;
  const classes = ROW_CLASSES[line.kind];
  return (
    <>
      <LineNumber
        value={side === 'before' ? line.beforeLine : line.afterLine}
        className={`${classes.gutter} ${border}`}
      />
      <span
        className={`text-center select-none ${classes.row}`}
        aria-label={line.kind === 'same' ? undefined : line.kind}
      >
        {SIGNS[line.kind]}
      </span>
      <span className={`min-w-0 ${classes.row}`}>
        <LineCode line={line} comma={side === 'before' ? line.commaBefore : line.comma} />
      </span>
    </>
  );
}

function LineNumber({ value, className }: { value: number | null; className: string }) {
  return (
    <span className={`pr-1.5 text-right text-muted tabular-nums select-none ${className}`}>
      {value ?? ''}
    </span>
  );
}

function LineCode({ line, comma }: { line: DiffLine; comma: boolean }) {
  return (
    <span
      className="block pr-2 break-all whitespace-pre-wrap"
      style={{ paddingLeft: `${line.depth * 2}ch` }}
    >
      {line.key !== '' && (
        <>
          <span className="text-syntax-key">{line.key.slice(0, -2)}</span>:{' '}
        </>
      )}
      <span
        className={`${VALUE_CLASSES[line.valueType]} ${
          line.emphasis ? `rounded-[2px] ${ROW_CLASSES[line.kind].emphasis}` : ''
        }`}
      >
        {line.text}
      </span>
      {comma && ','}
    </span>
  );
}
