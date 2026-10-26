import { isJsonObject } from './json';
import { appendPathSegment, EACH, type FieldPath } from './paths';

export type FieldType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export interface SchemaField {
  key: string;
  path: FieldPath;
  types: FieldType[];
  /** Number of sampled records in which the field appears at least once. */
  presence: number;
  inArray: boolean;
}

export interface Schema {
  fields: SchemaField[];
  sampleSize: number;
  recordCount: number;
}

interface FieldAccumulator {
  path: FieldPath;
  types: Set<FieldType>;
  presence: number;
  inArray: boolean;
}

export const SCHEMA_SAMPLE_SIZE = 1_000;
const MAX_FIELD_DEPTH = 6;
const ARRAY_ITEMS_PER_VALUE = 20;
const MAX_FIELDS = 500;
const MAX_VISITS = 250_000;
const GOLDEN_RATIO_FRACTION = 0.618_033_988_749_895;
const TYPE_ORDER: readonly FieldType[] = ['string', 'number', 'boolean', 'null', 'object', 'array'];

export function getFieldType(value: unknown): FieldType | undefined {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
    case 'bigint':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'object';
    default:
      return undefined;
  }
}

/**
 * Takes one record from each equal slice of the collection so it is covered end to end.
 * The position inside each slice varies (golden-ratio sequence) because a fixed stride
 * aliases with periodic data and can skip every record that carries a given field.
 */
export function sampleRecords(
  records: readonly unknown[],
  size = SCHEMA_SAMPLE_SIZE,
): readonly unknown[] {
  if (records.length <= size) return records;
  const step = records.length / size;
  return Array.from({ length: size }, (_, index) => {
    const offset = (index * GOLDEN_RATIO_FRACTION) % 1;
    return records[Math.floor((index + offset) * step)];
  });
}

export function inferSchema(records: readonly unknown[], sampleSize = SCHEMA_SAMPLE_SIZE): Schema {
  const sample = sampleRecords(records, sampleSize);
  const fields = new Map<string, FieldAccumulator>();
  let visits = 0;

  const addField = (
    key: string,
    path: FieldPath,
    type: FieldType,
    inArray: boolean,
    seen: Set<string>,
  ) => {
    let field = fields.get(key);
    if (!field) {
      if (fields.size >= MAX_FIELDS) return;
      field = { path, types: new Set(), presence: 0, inArray };
      fields.set(key, field);
    }
    field.types.add(type);
    if (!seen.has(key)) {
      seen.add(key);
      field.presence += 1;
    }
  };

  const walk = (
    value: unknown,
    path: FieldPath,
    key: string,
    inArray: boolean,
    seen: Set<string>,
  ): void => {
    visits += 1;
    if (visits > MAX_VISITS) return;
    const type = getFieldType(value);
    if (type === undefined) return;
    if (path.length > 0 || type !== 'object') addField(key, path, type, inArray, seen);
    if (path.length >= MAX_FIELD_DEPTH) return;

    if (isJsonObject(value)) {
      for (const child of Object.keys(value)) {
        walk(value[child], [...path, child], appendPathSegment(key, child), inArray, seen);
      }
    } else if (Array.isArray(value)) {
      const itemPath: FieldPath = [...path, EACH];
      const itemKey = appendPathSegment(key, EACH);
      const limit = Math.min(value.length, ARRAY_ITEMS_PER_VALUE);
      for (let index = 0; index < limit; index += 1) {
        walk(value[index], itemPath, itemKey, true, seen);
      }
    }
  };

  for (const record of sample) walk(record, [], '', false, new Set());

  return {
    fields: Array.from(fields, ([key, field]) => ({
      key,
      path: field.path,
      types: TYPE_ORDER.filter((type) => field.types.has(type)),
      presence: field.presence,
      inArray: field.inArray,
    })),
    sampleSize: sample.length,
    recordCount: records.length,
  };
}
