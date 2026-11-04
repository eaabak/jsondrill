import { idFieldScore } from './filters';
import { isJsonObject } from './json';
import { appendPathSegment, EACH, type FieldPath } from './paths';
import { inferSchema, type FieldType, type Schema } from './schema';

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface StructureChange {
  kind: ChangeKind;
  field: string;
  before: readonly FieldType[];
  after: readonly FieldType[];
}

export interface ValueChange {
  path: string;
  /** `path` without array indexes, such as `orders[].status`. */
  field: string;
  /** `undefined` means the value is missing on that side. */
  before: unknown;
  after: unknown;
}

export interface RecordChange {
  kind: ChangeKind;
  key: string;
  beforeIndex: number | null;
  afterIndex: number | null;
  changes: readonly ValueChange[];
  truncated: boolean;
}

export type RecordMatch = { kind: 'field'; field: string } | { kind: 'position' };

export interface CollectionDiff {
  match: RecordMatch;
  structure: StructureChange[];
  records: RecordChange[];
  counts: Record<ChangeKind | 'unchanged', number>;
}

const MAX_CHANGES_PER_RECORD = 100;
const KIND_ORDER: readonly ChangeKind[] = ['removed', 'changed', 'added'];

export function diffCollections(
  before: readonly unknown[],
  after: readonly unknown[],
): CollectionDiff {
  const beforeSchema = inferSchema(before);
  const afterSchema = inferSchema(after);
  const field =
    before.length === 1 && after.length === 1
      ? null
      : findIdentifierField(before, after, [beforeSchema, afterSchema]);
  const pairs = field === null ? pairByPosition(before, after) : pairById(before, after, field);

  const counts = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  const records: RecordChange[] = [];
  for (const pair of pairs) {
    const change = compareRecords(pair);
    if (change) {
      counts[change.kind] += 1;
      records.push(change);
    } else {
      counts.unchanged += 1;
    }
  }

  return {
    match: field === null ? { kind: 'position' } : { kind: 'field', field },
    structure: diffSchemas(beforeSchema, afterSchema),
    records,
    counts,
  };
}

export function diffSchemas(before: Schema, after: Schema): StructureChange[] {
  const beforeFields = new Map(before.fields.map((field) => [field.key, field]));
  const afterFields = new Map(after.fields.map((field) => [field.key, field]));
  const changes: (StructureChange & { path: FieldPath })[] = [];

  for (const field of before.fields) {
    const next = afterFields.get(field.key);
    if (!next) {
      changes.push({
        kind: 'removed',
        field: field.key,
        path: field.path,
        before: field.types,
        after: [],
      });
    } else if (field.types.join() !== next.types.join()) {
      changes.push({
        kind: 'changed',
        field: field.key,
        path: field.path,
        before: field.types,
        after: next.types,
      });
    }
  }
  for (const field of after.fields) {
    if (!beforeFields.has(field.key)) {
      changes.push({
        kind: 'added',
        field: field.key,
        path: field.path,
        before: [],
        after: field.types,
      });
    }
  }

  const keysByKind = new Map<ChangeKind, Set<string>>();
  for (const change of changes) {
    const keys = keysByKind.get(change.kind) ?? new Set();
    keys.add(change.field);
    keysByKind.set(change.kind, keys);
  }
  const hasSameKindAncestor = (change: StructureChange & { path: FieldPath }) => {
    const keys = keysByKind.get(change.kind);
    let ancestor = '';
    for (const segment of change.path.slice(0, -1)) {
      ancestor = appendPathSegment(ancestor, segment);
      if (keys?.has(ancestor)) return true;
    }
    return false;
  };

  return changes
    .filter((change) => change.kind === 'changed' || !hasSameKindAncestor(change))
    .toSorted((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
    .map(({ kind, field, before: types, after: nextTypes }) => ({
      kind,
      field,
      before: types,
      after: nextTypes,
    }));
}

export function countChangedFields(records: readonly RecordChange[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const field of new Set(record.changes.map((change) => change.field))) {
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
  }
  return [...counts].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

interface RecordPair {
  key: string;
  beforeIndex: number | null;
  afterIndex: number | null;
  before: unknown;
  after: unknown;
}

function findIdentifierField(
  before: readonly unknown[],
  after: readonly unknown[],
  schemas: readonly Schema[],
): string | null {
  const candidates = schemas
    .flatMap((schema) => schema.fields)
    .filter(
      (field) =>
        field.path.length === 1 &&
        typeof field.path[0] === 'string' &&
        idFieldScore(field) > 0 &&
        field.types.every((type) => type === 'string' || type === 'number'),
    )
    .toSorted((a, b) => idFieldScore(b) - idFieldScore(a));
  const tried = new Set<string>();
  for (const candidate of candidates) {
    const name = candidate.path[0];
    if (typeof name !== 'string' || tried.has(name)) continue;
    tried.add(name);
    if (hasUniqueKeys(before, name) && hasUniqueKeys(after, name)) return name;
  }
  return null;
}

function hasUniqueKeys(records: readonly unknown[], field: string): boolean {
  const seen = new Set<string>();
  for (const record of records) {
    const key = getRecordKey(record, field);
    if (key === null || seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

// Keys are compared as text so a change from 101 to "101" still pairs the records.
function getRecordKey(record: unknown, field: string): string | null {
  if (!isJsonObject(record)) return null;
  const value = record[field];
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
    ? String(value)
    : null;
}

function pairById(before: readonly unknown[], after: readonly unknown[], field: string) {
  const beforeByKey = new Map<string, number>();
  before.forEach((record, index) => {
    const key = getRecordKey(record, field);
    if (key !== null) beforeByKey.set(key, index);
  });

  const pairs: RecordPair[] = [];
  const matched = new Set<number>();
  after.forEach((record, afterIndex) => {
    const key = getRecordKey(record, field) ?? '';
    const beforeIndex = beforeByKey.get(key) ?? null;
    if (beforeIndex !== null) matched.add(beforeIndex);
    pairs.push({
      key,
      beforeIndex,
      afterIndex,
      before: beforeIndex === null ? undefined : before[beforeIndex],
      after: record,
    });
  });
  before.forEach((record, beforeIndex) => {
    if (matched.has(beforeIndex)) return;
    pairs.push({
      key: getRecordKey(record, field) ?? '',
      beforeIndex,
      afterIndex: null,
      before: record,
      after: undefined,
    });
  });
  return pairs;
}

function pairByPosition(before: readonly unknown[], after: readonly unknown[]): RecordPair[] {
  return Array.from({ length: Math.max(before.length, after.length) }, (_, index) => ({
    key: `#${index}`,
    beforeIndex: index < before.length ? index : null,
    afterIndex: index < after.length ? index : null,
    before: before[index],
    after: after[index],
  }));
}

function compareRecords(pair: RecordPair): RecordChange | null {
  const base = { key: pair.key, beforeIndex: pair.beforeIndex, afterIndex: pair.afterIndex };
  if (pair.beforeIndex === null) return { ...base, kind: 'added', changes: [], truncated: false };
  if (pair.afterIndex === null) return { ...base, kind: 'removed', changes: [], truncated: false };

  const changes: ValueChange[] = [];
  const truncated = !collectChanges(pair.before, pair.after, '', '', changes);
  return changes.length === 0 ? null : { ...base, kind: 'changed', changes, truncated };
}

/** Returns false when it stopped early because the record has too many changes. */
function collectChanges(
  before: unknown,
  after: unknown,
  path: string,
  field: string,
  out: ValueChange[],
): boolean {
  if (Object.is(before, after)) return true;
  if (isJsonObject(before) && isJsonObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      const complete = collectChanges(
        before[key],
        after[key],
        appendPathSegment(path, key),
        appendPathSegment(field, key),
        out,
      );
      if (!complete) return false;
    }
    return true;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const itemField = appendPathSegment(field, EACH);
    for (let index = 0; index < Math.max(before.length, after.length); index += 1) {
      if (!collectChanges(before[index], after[index], `${path}[${index}]`, itemField, out)) {
        return false;
      }
    }
    return true;
  }
  if (out.length >= MAX_CHANGES_PER_RECORD) return false;
  out.push({ path, field, before, after });
  return true;
}
