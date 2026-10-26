import { Braces, ChevronsDownUp, Copy, Download, RotateCcw, Table2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { copyText, downloadText } from '../exporting';
import { formatCount, getErrorMessage } from '../format';
import { SegmentedControl, type SegmentOption } from './SegmentedControl';

export type ResultView = 'table' | 'json';

const VIEW_OPTIONS: readonly SegmentOption<ResultView>[] = [
  { value: 'table', label: 'Table', icon: <Table2 size={12} aria-hidden /> },
  { value: 'json', label: 'JSON', icon: <Braces size={12} aria-hidden /> },
];

interface ResultToolbarProps {
  matchCount: number;
  totalCount: number;
  isFiltered: boolean;
  canReset: boolean;
  isPending: boolean;
  view: ResultView;
  onViewChange: (view: ResultView) => void;
  onReset: () => void;
  onCollapseAll: () => void;
  getJson: () => string;
  exportName: string;
}

export function ResultToolbar({
  matchCount,
  totalCount,
  isFiltered,
  canReset,
  isPending,
  view,
  onViewChange,
  onReset,
  onCollapseAll,
  getJson,
  exportName,
}: ResultToolbarProps) {
  const summary = isFiltered
    ? `${formatCount(matchCount, 'matching record')} of ${totalCount.toLocaleString('en-US')}`
    : formatCount(totalCount, 'record');

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line bg-surface-alt px-2 py-1">
      <span role="status" className="mr-auto pr-2 tabular-nums">
        {summary}
        {isPending && <span className="text-muted"> · filtering…</span>}
      </span>
      <SegmentedControl
        label="Result view"
        value={view}
        options={VIEW_OPTIONS}
        onChange={onViewChange}
      />
      {view === 'json' && (
        <button
          type="button"
          className="jd-icon-button"
          onClick={onCollapseAll}
          title="Collapse all"
          aria-label="Collapse all"
        >
          <ChevronsDownUp size={13} aria-hidden />
        </button>
      )}
      <button type="button" className="jd-button" onClick={onReset} disabled={!canReset}>
        <RotateCcw size={12} aria-hidden />
        Reset
      </button>
      <ExportActions getJson={getJson} fileName={exportName} />
    </div>
  );
}

interface Notice {
  tone: 'success' | 'error';
  text: string;
}

const NOTICE_DURATION_MS = 2_500;

function ExportActions({ getJson, fileName }: { getJson: () => string; fileName: string }) {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const copy = async () => {
    try {
      await copyText(getJson());
      setNotice({ tone: 'success', text: 'Copied' });
    } catch (error) {
      setNotice({ tone: 'error', text: describeExportError(error, 'Copy') });
    }
  };

  const download = () => {
    try {
      downloadText(fileName, getJson());
    } catch (error) {
      setNotice({ tone: 'error', text: describeExportError(error, 'Export') });
    }
  };

  return (
    <>
      {notice && (
        <span role="status" className={notice.tone === 'error' ? 'text-error' : 'text-success'}>
          {notice.text}
        </span>
      )}
      <button
        type="button"
        className="jd-button"
        onClick={() => void copy()}
        title="Copy matching records as JSON"
      >
        <Copy size={12} aria-hidden />
        Copy
      </button>
      <button
        type="button"
        className="jd-button"
        onClick={download}
        title="Download matching records as a JSON file"
      >
        <Download size={12} aria-hidden />
        Export
      </button>
    </>
  );
}

function describeExportError(error: unknown, action: string): string {
  if (error instanceof RangeError) return 'The result is too large to serialize.';
  return getErrorMessage(error, `${action} failed.`);
}
