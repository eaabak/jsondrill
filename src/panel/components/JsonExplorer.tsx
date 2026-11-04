import { useMemo, useState } from 'react';
import { findCollections, getCollectionRecords } from '../../core';
import { RecordExplorer } from './RecordExplorer';

interface JsonExplorerProps {
  data: unknown;
  precisionLoss: boolean;
  exportName: string;
}

export function JsonExplorer({ data, precisionLoss, exportName }: JsonExplorerProps) {
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
