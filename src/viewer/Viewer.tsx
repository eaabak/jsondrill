import { FileJson, FolderOpen, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatBytes } from '../core';
import { JsonExplorer } from '../panel/components/JsonExplorer';
import { getExportFileName } from '../panel/exporting';
import { getErrorMessage } from '../panel/format';
import {
  getFileSizeError,
  getSourceExportPath,
  PASTED_NAME,
  readSource,
  type JsonSource,
} from './source';

const PASTE_SHORTCUT = navigator.userAgent.includes('Mac') ? '⌘V' : 'Ctrl+V';

export function Viewer() {
  const [source, setSource] = useState<JsonSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const hasSource = source !== null;

  useEffect(() => {
    const open = (name: string, text: string) => {
      const result = readSource(name, text);
      if (result.ok) setSource(result.source);
      setError(result.ok ? null : `${name}: ${result.message}`);
    };

    const openFile = async (file: File) => {
      const sizeError = getFileSizeError(file.size);
      if (sizeError) {
        setError(`${file.name}: ${sizeError}`);
        return;
      }
      try {
        open(file.name, await file.text());
      } catch (cause) {
        setError(`${file.name}: ${getErrorMessage(cause, 'The file could not be read.')}`);
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      // Once a document is open, pasting belongs to its search and filter fields.
      if (hasSource || !event.clipboardData) return;
      const [file] = event.clipboardData.files;
      const text = event.clipboardData.getData('text/plain');
      if (file) void openFile(file);
      else if (text.trim() !== '') open(PASTED_NAME, text);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (event.relatedTarget === null) setIsDragging(false);
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) void openFile(file);
    };

    const input = fileInput.current;
    const handleChoose = () => {
      const file = input?.files?.[0];
      if (file) void openFile(file);
      // Lets the same file be chosen again after it changed on disk.
      if (input) input.value = '';
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    input?.addEventListener('change', handleChoose);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      input?.removeEventListener('change', handleChoose);
    };
  }, [hasSource]);

  const chooseButton = (
    <button type="button" className="jd-button" onClick={() => fileInput.current?.click()}>
      <FolderOpen size={12} aria-hidden />
      {hasSource ? 'Open another' : 'Choose a file'}
    </button>
  );
  const errorLine = error !== null && (
    <p role="alert" className="m-0 flex min-w-0 items-start gap-1.5 text-error">
      <TriangleAlert size={14} className="mt-px shrink-0" aria-hidden />
      <span className="min-w-0">{error}</span>
    </p>
  );

  return (
    <div
      className={`flex h-full flex-col ${isDragging ? 'outline-2 -outline-offset-2 outline-accent' : ''}`}
    >
      <input
        ref={fileInput}
        type="file"
        accept=".json,.har,.geojson,.txt,application/json,text/plain"
        aria-label="Choose a JSON file"
        className="hidden"
      />
      {source ? (
        <>
          <header className="flex min-h-8 shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface-alt px-2 py-1">
            <FileJson size={14} className="shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 truncate font-semibold">{source.name}</span>
            <span className="shrink-0 text-muted">{formatBytes(source.size)}</span>
            <span className="ml-auto flex min-w-0 items-center gap-2">
              {errorLine}
              {chooseButton}
            </span>
          </header>
          <main className="flex min-h-0 flex-1 flex-col">
            <JsonExplorer
              key={`${source.name} ${source.size}`}
              data={source.data}
              precisionLoss={source.precisionLoss}
              exportName={getExportFileName(getSourceExportPath(source.name))}
            />
          </main>
        </>
      ) : (
        <main className="flex min-h-0 flex-1 items-center justify-center p-4">
          <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-md border border-dashed border-line px-6 py-10 text-center text-sm">
            <FileJson size={32} className="text-muted" aria-hidden />
            <h1 className="m-0 text-lg font-semibold">Open a JSON file</h1>
            <p className="m-0 text-muted">
              Drop a file here, or paste JSON with <kbd className="font-mono">{PASTE_SHORTCUT}</kbd>
              .
            </p>
            {chooseButton}
            {errorLine}
            <p className="m-0 text-muted">Nothing leaves your computer.</p>
          </div>
        </main>
      )}
    </div>
  );
}
