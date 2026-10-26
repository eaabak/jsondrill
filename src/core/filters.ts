import { isJsonObject } from './json';
import { resolvePath, type FieldPath } from './paths';
import type { FieldType, SchemaField } from './schema';

export type Operator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'is_true'
  | 'is_false'
  | 'is_null'
  | 'is_missing';

export interface FilterCondition {
  path: FieldPath;
  operator: Operator;
  value: string;
}

export type SearchMode = 'exact' | 'contains';

export interface FieldSearch {
  /** `null` searches every value in the record, at any depth. */
  path: FieldPath | null;
  text: string;
  mode: SearchMode;
}

export interface RecordQuery {
  search: FieldSearch | null;
  conditions: readonly FilterCondition[];
}

type NumericOperator = 'gt' | 'lt' | 'gte' | 'lte';
type ValueTest = (value: unknown) => boolean;
type RecordPredicate = (record: unknown) => boolean;

export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: 'Equals',
  not_equals: 'Not equals',
  contains: 'Contains',
  starts_with: 'Starts with',
  is_empty: 'Is empty',
  is_not_empty: 'Is not empty',
  gt: 'Greater than',
  lt: 'Less than',
  gte: 'Greater than or equal',
  lte: 'Less than or equal',
  is_true: 'Is true',
  is_false: 'Is false',
  is_null: 'Is null',
  is_missing: 'Is missing',
};

const OPERATORS_BY_TYPE: Partial<Record<FieldType, readonly Operator[]>> = {
  string: ['equals', 'not_equals', 'contains', 'starts_with', 'is_empty', 'is_not_empty'],
  number: ['equals', 'not_equals', 'gt', 'lt', 'gte', 'lte'],
  boolean: ['is_true', 'is_false'],
};
const GENERAL_OPERATORS: readonly Operator[] = ['is_null', 'is_missing'];

const VALUE_OPERATORS: ReadonlySet<Operator> = new Set([
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'gt',
  'lt',
  'gte',
  'lte',
]);

const NUMERIC_COMPARISONS: Record<NumericOperator, (order: number) => boolean> = {
  gt: (order) => order > 0,
  lt: (order) => order < 0,
  gte: (order) => order >= 0,
  lte: (order) => order <= 0,
};

const DECIMAL_NUMBER = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const INTEGER_NUMBER = /^-?\d+$/;

const PRIMARY_ID_NAMES: ReadonlySet<string> = new Set(['id', '_id']);
const COMMON_ID_NAMES: ReadonlySet<string> = new Set(['uuid', 'guid', 'uid', 'key', 'slug']);
const ID_SUFFIX = /(?:_id|_uuid|[a-z0-9](?:Id|ID|Uuid|UUID))$/;
const MAX_SEARCH_DEPTH = 8;

export function operatorsForTypes(types: readonly FieldType[]): Operator[] {
  const operators = new Set<Operator>();
  for (const type of types) {
    for (const operator of OPERATORS_BY_TYPE[type] ?? []) operators.add(operator);
  }
  for (const operator of GENERAL_OPERATORS) operators.add(operator);
  return [...operators];
}

export function operatorNeedsValue(operator: Operator): boolean {
  return VALUE_OPERATORS.has(operator);
}

export function isNumericOperator(operator: Operator): operator is NumericOperator {
  return Object.hasOwn(NUMERIC_COMPARISONS, operator);
}

export function isValidConditionValue(operator: Operator, value: string): boolean {
  return !isNumericOperator(operator) || value.trim() === '' || parseNumber(value) !== null;
}

/**
 * Parses user input without losing precision: integers outside the safe range become
 * bigint so they can be compared exactly against bigint values from the parser.
 */
export function parseNumber(text: string): number | bigint | null {
  const trimmed = text.trim();
  if (!DECIMAL_NUMBER.test(trimmed)) return null;
  const value = Number(trimmed);
  if (INTEGER_NUMBER.test(trimmed) && !Number.isSafeInteger(value)) return BigInt(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function compileQuery(query: RecordQuery): RecordPredicate {
  const predicates = compilePredicates(query);
  return (record) => predicates.every((predicate) => predicate(record));
}

/** True when the search or at least one filter condition is complete enough to apply. */
export function isQueryActive(query: RecordQuery): boolean {
  return compilePredicates(query).length > 0;
}

/** Returns the indices of matching records so callers can reference the original data. */
export function filterRecords(records: readonly unknown[], query: RecordQuery): number[] {
  const matches = compileQuery(query);
  const indices: number[] = [];
  records.forEach((record, index) => {
    if (matches(record)) indices.push(index);
  });
  return indices;
}

/** Lists string and number fields, identifier-like fields first. */
export function rankSearchFields(fields: readonly SchemaField[]): SchemaField[] {
  return fields
    .filter((field) => field.types.includes('string') || field.types.includes('number'))
    .map((field, order) => ({ field, order, score: idFieldScore(field) }))
    .toSorted(
      (a, b) => b.score - a.score || a.field.path.length - b.field.path.length || a.order - b.order,
    )
    .map(({ field }) => field);
}

function idFieldScore(field: SchemaField): number {
  const name = field.path.at(-1);
  if (typeof name !== 'string') return 0;
  const normalized = name.toLowerCase();
  if (PRIMARY_ID_NAMES.has(normalized)) return 3;
  if (COMMON_ID_NAMES.has(normalized)) return 2;
  return ID_SUFFIX.test(name) ? 1 : 0;
}

function compilePredicates(query: RecordQuery): RecordPredicate[] {
  return [
    query.search ? compileSearch(query.search) : null,
    ...query.conditions.map(compileCondition),
  ].filter((predicate): predicate is RecordPredicate => predicate !== null);
}

function compileSearch({ path, text, mode }: FieldSearch): RecordPredicate | null {
  const query = text.trim();
  if (query === '') return null;
  const test = mode === 'exact' ? createEqualsTest(query) : createContainsTest(query);
  if (path === null) return (record) => someNestedValue(record, test, 0);
  return (record) => resolvePath(record, path).values.some(test);
}

function someNestedValue(value: unknown, test: ValueTest, depth: number): boolean {
  if (Array.isArray(value)) {
    return depth < MAX_SEARCH_DEPTH && value.some((item) => someNestedValue(item, test, depth + 1));
  }
  if (isJsonObject(value)) {
    return (
      depth < MAX_SEARCH_DEPTH &&
      Object.values(value).some((item) => someNestedValue(item, test, depth + 1))
    );
  }
  return test(value);
}

function compileCondition({ path, operator, value }: FilterCondition): RecordPredicate | null {
  if (operator === 'is_missing') return (record) => resolvePath(record, path).missing;
  const test = createValueTest(operator, value);
  if (!test) return null;
  return (record) => resolvePath(record, path).values.some(test);
}

function createValueTest(
  operator: Exclude<Operator, 'is_missing'>,
  input: string,
): ValueTest | null {
  if (operatorNeedsValue(operator) && input.trim() === '') return null;

  switch (operator) {
    case 'equals':
      return createEqualsTest(input);
    case 'not_equals': {
      const equals = createEqualsTest(input);
      return (value) => !equals(value);
    }
    case 'contains': {
      const needle = input.toLowerCase();
      return (value) => typeof value === 'string' && value.toLowerCase().includes(needle);
    }
    case 'starts_with': {
      const prefix = input.toLowerCase();
      return (value) => typeof value === 'string' && value.toLowerCase().startsWith(prefix);
    }
    case 'is_empty':
      return (value) => value === '';
    case 'is_not_empty':
      return (value) => typeof value === 'string' && value !== '';
    case 'gt':
    case 'lt':
    case 'gte':
    case 'lte':
      return createNumericTest(operator, input);
    case 'is_true':
      return (value) => value === true;
    case 'is_false':
      return (value) => value === false;
    case 'is_null':
      return (value) => value === null;
  }
}

/**
 * Strings compare exactly; numbers compare by numeric value so "101" matches 101 and
 * large integers match their bigint representation without rounding.
 */
function createEqualsTest(input: string): ValueTest {
  const numeric = parseNumber(input);
  const literal = input.trim();
  return (value) => {
    if (typeof value === 'string') return value === input;
    if (isNumeric(value)) return numeric !== null && compareNumbers(value, numeric) === 0;
    if (typeof value === 'boolean') return String(value) === literal;
    return false;
  };
}

function createContainsTest(query: string): ValueTest {
  const needle = query.toLowerCase();
  return (value) =>
    (typeof value === 'string' || isNumeric(value)) && String(value).toLowerCase().includes(needle);
}

function createNumericTest(operator: NumericOperator, input: string): ValueTest | null {
  const target = parseNumber(input);
  if (target === null) return null;
  const accepts = NUMERIC_COMPARISONS[operator];
  return (value) => isNumeric(value) && accepts(compareNumbers(value, target));
}

function isNumeric(value: unknown): value is number | bigint {
  return typeof value === 'number' || typeof value === 'bigint';
}

// Relational operators compare number and bigint by mathematical value, so mixed pairs stay exact.
function compareNumbers(a: number | bigint, b: number | bigint): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
