import { useMemo, useRef, useState } from 'react';
import {
  operatorsForTypes,
  rankSearchFields,
  type Operator,
  type RecordQuery,
  type Schema,
  type SchemaField,
  type SearchMode,
} from '../../core';

export interface FilterRow {
  id: number;
  field: SchemaField;
  operator: Operator;
  value: string;
}

export type FilterRowChanges = Partial<Pick<FilterRow, 'field' | 'operator' | 'value'>>;

export function useRecordQuery(schema: Schema) {
  const searchFields = useMemo(() => rankSearchFields(schema.fields), [schema]);
  const [searchFieldKey, setSearchFieldKey] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('contains');
  const [rows, setRows] = useState<FilterRow[]>([]);
  const nextRowId = useRef(1);

  const searchField = searchFields.find((field) => field.key === searchFieldKey) ?? null;

  const query = useMemo<RecordQuery>(
    () => ({
      search: { path: searchField?.path ?? null, text: searchText, mode: searchMode },
      conditions: rows.map(({ field, operator, value }) => ({ path: field.path, operator, value })),
    }),
    [searchField, searchText, searchMode, rows],
  );

  const addRow = () => {
    const field =
      schema.fields.find((candidate) => candidate.types.some(isScalarType)) ?? schema.fields[0];
    if (!field) return;
    const id = nextRowId.current;
    nextRowId.current += 1;
    setRows((current) => [...current, { id, field, operator: defaultOperator(field), value: '' }]);
  };

  const updateRow = (id: number, changes: FilterRowChanges) => {
    setRows((current) => current.map((row) => (row.id === id ? applyChanges(row, changes) : row)));
  };

  const removeRow = (id: number) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const reset = () => {
    setSearchText('');
    setRows([]);
  };

  return {
    query,
    hasInput: searchText.trim() !== '' || rows.length > 0,
    searchFields,
    searchField,
    searchText,
    searchMode,
    setSearchFieldKey,
    setSearchText,
    setSearchMode,
    rows,
    addRow,
    updateRow,
    removeRow,
    reset,
  };
}

function isScalarType(type: SchemaField['types'][number]): boolean {
  return type !== 'object' && type !== 'array';
}

function defaultOperator(field: SchemaField): Operator {
  return operatorsForTypes(field.types)[0] ?? 'is_missing';
}

function applyChanges(row: FilterRow, changes: FilterRowChanges): FilterRow {
  const next = { ...row, ...changes };
  if (changes.field && !operatorsForTypes(changes.field.types).includes(next.operator)) {
    next.operator = defaultOperator(changes.field);
  }
  return next;
}
