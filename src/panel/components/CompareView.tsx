import { Columns2, List, Rows2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import {
  countChangedFields,
  diffCollections,
  findSharedCollections,
  getCollectionRecords,
  type ChangeKind,
  type RecordChange,
  type StructureChange,
} from '../../core';
import { formatCount, formatJsonValue, previewContainer } from '../format';
import { RecordDiff } from './RecordDiff';
import { SegmentedControl, type SegmentOption } from './SegmentedControl';
import { StatusMessage } from './StatusMessage';

type KindFilter = ChangeKind | 'all';
type RecordView = 'summary' | 'unified' | 'split';

interface CompareViewProps {
  before: unknown;
  after: unknown;
  beforeTime: string;
  afterTime: string;
}

const MAX_VISIBLE_RECORDS = 200;
const MAX_VISIBLE_DIFFS = 100;
const MAX_HEADER_FIELDS = 4;
const VIEW_OPTIONS: readonly SegmentOption<RecordView>[] = [
  { value: 'summary', label: 'Summary', icon: <List size={12} aria-hidden /> },
  { value: 'unified', label: 'Unified', icon: <Rows2 size={12} aria-hidden /> },
  { value: 'split', label: 'Split', icon: <Columns2 size={12} aria-hidden /> },
];
const MAX_VISIBLE_CHANGES = 20;
const MARKS: Record<ChangeKind, { symbol: string; className: string; label: string }> = {
  added: { symbol: '+', className: 'text-success', label: 'Added' },
  removed: { symbol: '−', className: 'text-error', label: 'Removed' },
  changed: { symbol: '~', className: 'text-warning', label: 'Changed' },
};

export function CompareView({ before, after, beforeTime, afterTime }: CompareViewProps) {
  const collections = useMemo(() => findSharedCollections(before, after), [before, after]);
  const [collectionKey, setCollectionKey] = useState(collections[0].key);
  const collection =
    collections.find((candidate) => candidate.key === collectionKey) ?? collections[0];
  const beforeRecords = useMemo(
    () => getCollectionRecords(before, collection.path),
    [before, collection],
  );
  const afterRecords = useMemo(
    () => getCollectionRecords(after, collection.path),
    [after, collection],
  );
  const diff = useMemo(
    () => diffCollections(beforeRecords, afterRecords),
    [beforeRecords, afterRecords],
  );

  const [kind, setKind] = useState<KindFilter>('all');
  const [view, setView] = useState<RecordView>('unified');
  const [field, setField] = useState('');
  const changedFields = useMemo(() => countChangedFields(diff.records), [diff]);
  const visible = useMemo(
    () =>
      diff.records.filter(
        (record) =>
          (kind === 'all' || record.kind === kind) &&
          (field === '' || record.changes.some((change) => change.field === field)),
      ),
    [diff, kind, field],
  );
  const collectionId = useId();
  const fieldId = useId();

  const kindOptions: readonly SegmentOption<KindFilter>[] = [
    { value: 'all', label: `All ${diff.records.length}` },
    { value: 'added', label: `Added ${diff.counts.added}` },
    { value: 'removed', label: `Removed ${diff.counts.removed}` },
    { value: 'changed', label: `Changed ${diff.counts.changed}` },
  ];
  const isIdentical = diff.records.length === 0 && diff.structure.length === 0;
  const matchField = diff.match.kind === 'field' ? diff.match.field : null;
  const visibleLimit = view === 'summary' ? MAX_VISIBLE_RECORDS : MAX_VISIBLE_DIFFS;
  const showStructure = diff.structure.length > 0 && kind === 'all' && field === '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 border-b border-line px-2 py-2">
        <label htmlFor={collectionId} className="text-muted">
          Collection
        </label>
        <div className="flex min-w-0 items-center gap-2">
          <select
            id={collectionId}
            className="jd-select max-w-64 min-w-0 font-mono"
            value={collection.key}
            onChange={(event) => {
              setCollectionKey(event.target.value);
              setKind('all');
              setField('');
            }}
            disabled={collections.length < 2}
          >
            {collections.map((candidate) => (
              <option key={candidate.key} value={candidate.key}>
                {candidate.label}
              </option>
            ))}
          </select>
          <span className="min-w-0 truncate text-muted tabular-nums">
            {beforeTime} → {afterTime} ·{' '}
            {diff.match.kind === 'field' ? `matched by ${diff.match.field}` : 'matched by position'}
          </span>
        </div>

        <span className="text-muted">Show</span>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SegmentedControl
            label="Change type"
            value={kind}
            options={kindOptions}
            onChange={(next) => {
              setKind(next);
              if (next === 'added' || next === 'removed') setField('');
            }}
          />
          {changedFields.length > 0 && (
            <>
              <label htmlFor={fieldId} className="sr-only">
                Changed field
              </label>
              <select
                id={fieldId}
                className="jd-select max-w-56 min-w-0 font-mono"
                value={field}
                onChange={(event) => {
                  setField(event.target.value);
                  if (event.target.value !== '') setKind('changed');
                }}
              >
                <option value="">Any field</option>
                {changedFields.map(([name, count]) => (
                  <option key={name} value={name}>
                    {name || '(value)'} ({count})
                  </option>
                ))}
              </select>
            </>
          )}
          <span className="text-muted tabular-nums">
            {formatCount(diff.counts.unchanged, 'unchanged record')}
          </span>
        </div>
      </div>

      {isIdentical ? (
        <StatusMessage>
          No differences in {collection.label === '(root)' ? 'the response' : collection.label}.
        </StatusMessage>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto font-mono text-[11px]">
          {showStructure && <StructureSection changes={diff.structure} />}
          {visible.length === 0 ? (
            <p className="m-0 px-2 py-2 font-sans text-xs text-muted">
              No records match this selection.
            </p>
          ) : (
            <section aria-label="Record changes">
              <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface-alt px-2 py-1 font-sans">
                <h3 className="m-0 mr-auto text-xs font-semibold">
                  Records <span className="font-normal text-muted">({visible.length})</span>
                </h3>
                <SegmentedControl
                  label="Record view"
                  value={view}
                  options={VIEW_OPTIONS}
                  onChange={setView}
                />
              </div>
              {visible.slice(0, visibleLimit).map((record) => {
                const key = `${record.kind}:${record.beforeIndex}:${record.afterIndex}`;
                const beforeValue =
                  record.beforeIndex === null ? undefined : beforeRecords[record.beforeIndex];
                const afterValue =
                  record.afterIndex === null ? undefined : afterRecords[record.afterIndex];
                return view === 'summary' ? (
                  <RecordRow
                    key={key}
                    record={record}
                    matchField={matchField}
                    value={record.kind === 'removed' ? beforeValue : afterValue}
                  />
                ) : (
                  <RecordDiff
                    key={key}
                    header={<RecordHeader record={record} matchField={matchField} />}
                    before={beforeValue}
                    after={afterValue}
                    mode={view}
                  />
                );
              })}
              {visible.length > visibleLimit && (
                <p className="m-0 px-2 py-2 font-sans text-xs text-muted">
                  Showing the first {visibleLimit} of {visible.length.toLocaleString('en-US')}{' '}
                  records. Narrow the list with the options above.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function StructureSection({ changes }: { changes: readonly StructureChange[] }) {
  return (
    <section aria-label="Structure changes" className="border-b border-line">
      <h3 className="sticky top-0 z-10 m-0 border-b border-line bg-surface-alt px-2 py-1 font-sans text-xs font-semibold">
        Structure <span className="font-normal text-muted">({changes.length})</span>
      </h3>
      {changes.map((change) => {
        const mark = MARKS[change.kind];
        return (
          <div
            key={`${change.kind}:${change.field}`}
            className="flex items-baseline gap-2 border-b border-line/50 px-2 py-0.5 last:border-b-0"
          >
            <span className={`w-3 shrink-0 font-semibold ${mark.className}`} title={mark.label}>
              {mark.symbol}
            </span>
            <span className="min-w-0 shrink-0 break-all text-syntax-key">{change.field}</span>
            <span className="min-w-0 text-muted">
              {change.kind === 'changed' ? (
                <>
                  <span className="text-error">{change.before.join(' | ')}</span> →{' '}
                  <span className="text-success">{change.after.join(' | ')}</span>
                </>
              ) : (
                `${(change.kind === 'added' ? change.after : change.before).join(' | ')} · ${
                  change.kind === 'added' ? 'new field' : 'removed'
                }`
              )}
            </span>
          </div>
        );
      })}
    </section>
  );
}

interface RecordRowProps {
  record: RecordChange;
  matchField: string | null;
  value: unknown;
}

function RecordRow({ record, matchField, value }: RecordRowProps) {
  const mark = MARKS[record.kind];
  const hidden = record.changes.length - MAX_VISIBLE_CHANGES;
  return (
    <div className="flex items-baseline gap-2 border-b border-line/50 px-2 py-0.5">
      <span className={`w-3 shrink-0 font-semibold ${mark.className}`} title={mark.label}>
        {mark.symbol}
      </span>
      <span className="w-28 shrink-0 truncate" title={record.key}>
        {matchField === null ? record.key : `${matchField} ${record.key}`}
      </span>
      {record.kind === 'changed' ? (
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(6rem,max-content)_minmax(0,1fr)] gap-x-3">
          {record.changes.slice(0, MAX_VISIBLE_CHANGES).map((change) => (
            <div key={change.path} className="contents">
              <span className="truncate text-syntax-key" title={change.path}>
                {change.path || '(value)'}
              </span>
              <span className="min-w-0 break-all">
                <ChangeValue value={change.before} className="text-error" /> →{' '}
                <ChangeValue value={change.after} className="text-success" />
              </span>
            </div>
          ))}
          {(hidden > 0 || record.truncated) && (
            <span className="col-span-2 text-muted">
              {hidden > 0 ? `+${hidden}` : ''} more changes
            </span>
          )}
        </div>
      ) : (
        <span className="min-w-0 flex-1 truncate text-muted">{previewContainer(value)}</span>
      )}
    </div>
  );
}

function RecordHeader({ record, matchField }: Omit<RecordRowProps, 'value'>) {
  const mark = MARKS[record.kind];
  const fields = [...new Set(record.changes.map((change) => change.field || '(value)'))];
  const detail =
    record.kind === 'changed'
      ? `${fields.slice(0, MAX_HEADER_FIELDS).join(', ')}${
          fields.length > MAX_HEADER_FIELDS ? ` +${fields.length - MAX_HEADER_FIELDS}` : ''
        }`
      : record.kind === 'added'
        ? 'new record'
        : 'removed record';
  return (
    <>
      <span className={`w-3 shrink-0 font-semibold ${mark.className}`} title={mark.label}>
        {mark.symbol}
      </span>
      <span className="shrink-0 font-semibold">
        {matchField === null ? record.key : `${matchField} ${record.key}`}
      </span>
      <span className="min-w-0 truncate text-muted">{detail}</span>
    </>
  );
}

function ChangeValue({ value, className }: { value: unknown; className: string }) {
  return value === undefined ? (
    <span className="text-muted italic">missing</span>
  ) : (
    <span className={className}>{formatJsonValue(value)}</span>
  );
}
