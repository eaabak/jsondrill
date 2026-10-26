import { useMemo, useState } from 'react';
import { findCollections, formatBytes, getCollectionRecords } from '../../core';
import { isFailedStatus, type CapturedRequest } from '../../network/requests';
import { getExportFileName } from '../exporting';
import { useResponseJson } from '../hooks/useResponseJson';
import { RecordExplorer } from './RecordExplorer';
import { StatusMessage } from './StatusMessage';

export function ResponsePanel({ request }: { request: CapturedRequest }) {
  const response = useResponseJson(request);

  return (
    <section className="flex h-full min-w-0 flex-col" aria-label="Response">
      <header
        className="flex h-8 shrink-0 items-center gap-2 border-b border-line bg-surface-alt px-2 font-mono text-[11px]"
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
      </header>
      {response.kind === 'loading' && <StatusMessage>Loading response…</StatusMessage>}
      {response.kind === 'error' && <StatusMessage tone="error">{response.message}</StatusMessage>}
      {response.kind === 'ready' && (
        <ResponseExplorer
          data={response.data}
          precisionLoss={response.precisionLoss}
          exportName={getExportFileName(request.path)}
        />
      )}
    </section>
  );
}

interface ResponseExplorerProps {
  data: unknown;
  precisionLoss: boolean;
  exportName: string;
}

function ResponseExplorer({ data, precisionLoss, exportName }: ResponseExplorerProps) {
  const collections = useMemo(() => findCollections(data), [data]);
  const [collectionKey, setCollectionKey] = useState(collections[0].key);
  const collection =
    collections.find((candidate) => candidate.key === collectionKey) ?? collections[0];
  const records = useMemo(() => getCollectionRecords(data, collection.path), [data, collection]);

  return (
    <>
      {precisionLoss && (
        <p role="note" className="shrink-0 border-b border-line px-2 py-1 text-warning">
          Some integers exceed the safe JavaScript range and were rounded by this browser. Exact
          matching on those values may fail.
        </p>
      )}
      <RecordExplorer
        key={collection.key}
        records={records}
        collections={collections}
        collection={collection}
        onCollectionChange={setCollectionKey}
        exportName={exportName}
      />
    </>
  );
}
