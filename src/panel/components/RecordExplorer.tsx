import { Plus } from 'lucide-react';
import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import {
  filterRecords,
  inferSchema,
  isQueryActive,
  stringifyJson,
  type Collection,
} from '../../core';
import { useRecordQuery } from '../hooks/useRecordQuery';
import { FilterBuilder } from './FilterBuilder';
import { JsonTree } from './JsonTree';
import { ResultToolbar, type ResultView } from './ResultToolbar';
import { SearchBar } from './SearchBar';
import { StatusMessage } from './StatusMessage';
import { TableView } from './TableView';

interface RecordExplorerProps {
  records: readonly unknown[];
  collections: readonly Collection[];
  collection: Collection;
  onCollectionChange: (key: string) => void;
  exportName: string;
}

export function RecordExplorer({
  records,
  collections,
  collection,
  onCollectionChange,
  exportName,
}: RecordExplorerProps) {
  const schema = useMemo(() => inferSchema(records), [records]);
  const recordQuery = useRecordQuery(schema);
  const deferredQuery = useDeferredValue(recordQuery.query);
  const matches = useMemo(() => filterRecords(records, deferredQuery), [records, deferredQuery]);
  const isSingleRecord = records.length === 1;
  const [view, setView] = useState<ResultView>(isSingleRecord ? 'json' : 'table');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(isSingleRecord ? ['0'] : []),
  );
  const [revealId, setRevealId] = useState<string | null>(null);

  const openRecord = (index: number) => {
    const id = String(index);
    setExpanded((current) => new Set(current).add(id));
    setRevealId(id);
    setView('json');
  };

  const toggleNode = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  let results: ReactNode;
  if (records.length === 0) {
    results = <StatusMessage>The selected collection is empty.</StatusMessage>;
  } else if (matches.length === 0) {
    results = <StatusMessage>No records match the current search and filters.</StatusMessage>;
  } else if (view === 'table') {
    results = (
      <TableView
        records={records}
        matches={matches}
        fields={schema.fields}
        onOpenRecord={openRecord}
      />
    );
  } else {
    results = (
      <JsonTree
        records={records}
        matches={matches}
        expanded={expanded}
        revealId={revealId}
        onToggle={toggleNode}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex max-h-[50%] shrink-0 flex-col gap-1.5 overflow-auto border-b border-line px-2 py-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {collections.length > 1 && (
            <select
              className="jd-select max-w-56 min-w-0 font-mono"
              aria-label="List to show"
              title="This response has several lists. Choose the one to show."
              value={collection.key}
              onChange={(event) => onCollectionChange(event.target.value)}
            >
              {collections.map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.label} ({candidate.size.toLocaleString('en-US')})
                </option>
              ))}
            </select>
          )}
          <SearchBar
            fields={recordQuery.searchFields}
            field={recordQuery.searchField}
            text={recordQuery.searchText}
            mode={recordQuery.searchMode}
            onFieldChange={recordQuery.setSearchFieldKey}
            onTextChange={recordQuery.setSearchText}
            onModeChange={recordQuery.setSearchMode}
          />
          <button
            type="button"
            className="jd-button"
            onClick={recordQuery.addRow}
            disabled={schema.fields.length === 0}
            title="Keep only the records where a field matches a condition"
          >
            <Plus size={12} aria-hidden />
            Add filter
          </button>
        </div>
        <FilterBuilder
          fields={schema.fields}
          sampleSize={schema.sampleSize}
          rows={recordQuery.rows}
          onChange={recordQuery.updateRow}
          onRemove={recordQuery.removeRow}
        />
      </div>
      <ResultToolbar
        matchCount={matches.length}
        totalCount={records.length}
        source={collections.length === 1 && collection.path.length > 0 ? collection.label : ''}
        isFiltered={isQueryActive(deferredQuery)}
        canReset={recordQuery.hasInput}
        isPending={deferredQuery !== recordQuery.query}
        view={view}
        onViewChange={setView}
        onReset={recordQuery.reset}
        onCollapseAll={() => setExpanded(new Set())}
        getJson={() => stringifyJson(matches.map((index) => records[index]))}
        exportName={exportName}
      />
      <div className="min-h-0 flex-1">{results}</div>
    </div>
  );
}
