import { describe, expect, it } from 'vitest';
import {
  EACH,
  filterRecords,
  getCollectionRecords,
  inferSchema,
  isQueryActive,
  isValidConditionValue,
  operatorsForTypes,
  parseJson,
  rankSearchFields,
  type FieldPath,
  type FieldSearch,
  type FilterCondition,
  type Operator,
} from '../src/core';

const users = [
  {
    id: 101,
    uuid: 'a1b2-c3',
    name: 'Alice',
    age: 28,
    active: true,
    email: 'alice@example.com',
    profile: { city: 'Berlin' },
    orders: [
      { status: 'paid', total: 30 },
      { status: 'pending', total: 12 },
    ],
  },
  {
    id: 102,
    uuid: 'd4e5-f6',
    name: null,
    age: 35,
    active: false,
    email: '',
    profile: { city: 'Paris' },
    orders: [{ status: 'refunded', total: 50 }],
  },
  { id: 103, uuid: 'g7h8-i9', name: 'Bob', age: 41, active: true, profile: null, orders: [] },
  {
    id: '104',
    uuid: 'j0k1-l2',
    name: 'Carol',
    age: '35',
    active: 'yes',
    email: 'carol@example.com',
    profile: { city: 'Berlin' },
  },
];

function where(path: FieldPath, operator: Operator, value = ''): FilterCondition {
  return { path, operator, value };
}

function matchIds(conditions: FilterCondition[], search: FieldSearch | null = null) {
  return filterRecords(users, { search, conditions }).map((index) => users[index]?.id);
}

function searchIds(path: FieldPath | null, text: string, mode: FieldSearch['mode'] = 'exact') {
  return matchIds([], { path, text, mode });
}

describe('field search', () => {
  it('matches numeric IDs exactly, regardless of JSON type', () => {
    expect(searchIds(['id'], '101')).toEqual([101]);
    expect(searchIds(['id'], '104')).toEqual(['104']);
    expect(searchIds(['id'], ' 102 ')).toEqual([102]);
    expect(searchIds(['id'], '10')).toEqual([]);
  });

  it('matches string IDs exactly', () => {
    expect(searchIds(['uuid'], 'd4e5-f6')).toEqual([102]);
    expect(searchIds(['uuid'], 'd4e5')).toEqual([]);
  });

  it('supports case-insensitive contains matching', () => {
    expect(searchIds(['uuid'], 'E5', 'contains')).toEqual([102]);
    expect(searchIds(['id'], '10', 'contains')).toEqual([101, 102, 103, '104']);
  });

  it('returns every record for an empty query', () => {
    expect(searchIds(['id'], '  ')).toHaveLength(users.length);
    expect(searchIds(null, '')).toHaveLength(users.length);
  });

  it('searches every value at any depth when no field is selected', () => {
    expect(searchIds(null, 'berlin', 'contains')).toEqual([101, '104']);
    expect(searchIds(null, 'refunded')).toEqual([102]);
    expect(searchIds(null, '35')).toEqual([102, '104']);
    expect(searchIds(null, 'city', 'contains')).toEqual([]);
  });

  it('distinguishes integers beyond the safe range', () => {
    const parsed = parseJson('[{"id":9007199254740993},{"id":9007199254740992}]');
    if (!parsed.ok) throw new Error(parsed.message);
    const records = getCollectionRecords(parsed.value, []);
    const search = (text: string) =>
      filterRecords(records, { search: { path: ['id'], text, mode: 'exact' }, conditions: [] });
    expect(search('9007199254740993')).toEqual([0]);
    expect(search('9007199254740992')).toEqual([1]);
  });

  it('finds records inside nested collections and combines with filters', () => {
    const response = {
      data: {
        items: [
          { sku: 'X-1', stock: 0 },
          { sku: 'X-2', stock: 4 },
          { sku: 'Y-2', stock: 9 },
        ],
      },
    };
    const records = getCollectionRecords(response, ['data', 'items']);
    const matches = filterRecords(records, {
      search: { path: ['sku'], text: '-2', mode: 'contains' },
      conditions: [where(['stock'], 'gt', '5')],
    });
    expect(matches).toEqual([2]);
  });
});

describe('null, missing and empty values', () => {
  it('matches null only with Is null', () => {
    expect(matchIds([where(['name'], 'is_null')])).toEqual([102]);
    expect(matchIds([where(['name'], 'is_missing')])).toEqual([]);
  });

  it('matches missing fields only with Is missing', () => {
    expect(matchIds([where(['email'], 'is_missing')])).toEqual([103]);
    expect(matchIds([where(['email'], 'is_null')])).toEqual([]);
    expect(matchIds([where(['email'], 'not_equals', 'alice@example.com')])).toEqual([102, '104']);
  });

  it('treats empty strings separately from null and missing', () => {
    expect(matchIds([where(['email'], 'is_empty')])).toEqual([102]);
    expect(matchIds([where(['email'], 'is_not_empty')])).toEqual([101, '104']);
  });
});

describe('string operators', () => {
  it('compares equality exactly and substrings case-insensitively', () => {
    expect(matchIds([where(['name'], 'equals', 'Alice')])).toEqual([101]);
    expect(matchIds([where(['name'], 'equals', 'alice')])).toEqual([]);
    expect(matchIds([where(['name'], 'not_equals', 'Alice')])).toEqual([102, 103, '104']);
    expect(matchIds([where(['name'], 'contains', 'AR')])).toEqual(['104']);
    expect(matchIds([where(['name'], 'starts_with', 'b')])).toEqual([103]);
  });
});

describe('number operators', () => {
  it('compares numeric values and ignores numeric-looking strings', () => {
    expect(matchIds([where(['age'], 'gt', '30')])).toEqual([102, 103]);
    expect(matchIds([where(['age'], 'gte', '35')])).toEqual([102, 103]);
    expect(matchIds([where(['age'], 'lt', '35')])).toEqual([101]);
    expect(matchIds([where(['age'], 'lte', '35')])).toEqual([101, 102]);
  });

  it('matches mixed number and string fields with Equals', () => {
    expect(matchIds([where(['age'], 'equals', '35')])).toEqual([102, '104']);
  });

  it('compares bigint values exactly', () => {
    const parsed = parseJson('[{"n":12345678901234567890},{"n":5}]');
    if (!parsed.ok) throw new Error(parsed.message);
    const records = getCollectionRecords(parsed.value, []);
    const query = (operator: Operator, value: string) =>
      filterRecords(records, { search: null, conditions: [where(['n'], operator, value)] });
    expect(query('gt', '12345678901234567889')).toEqual([0]);
    expect(query('lt', '12345678901234567890')).toEqual([1]);
    expect(query('equals', '12345678901234567890')).toEqual([0]);
  });

  it('ignores incomplete or invalid numeric conditions', () => {
    expect(matchIds([where(['age'], 'gt', '')])).toHaveLength(users.length);
    expect(matchIds([where(['age'], 'gt', 'abc')])).toHaveLength(users.length);
    expect(isValidConditionValue('gt', 'abc')).toBe(false);
    expect(isValidConditionValue('gt', '0x10')).toBe(false);
    expect(isValidConditionValue('gt', '-1.5e3')).toBe(true);
    expect(isValidConditionValue('contains', 'abc')).toBe(true);
  });
});

describe('boolean operators', () => {
  it('matches only real booleans', () => {
    expect(matchIds([where(['active'], 'is_true')])).toEqual([101, 103]);
    expect(matchIds([where(['active'], 'is_false')])).toEqual([102]);
  });
});

describe('combined and nested conditions', () => {
  it('combines conditions with AND', () => {
    expect(matchIds([where(['age'], 'gte', '30'), where(['active'], 'is_true')])).toEqual([103]);
    expect(
      matchIds([where(['profile', 'city'], 'equals', 'Berlin')], {
        path: ['id'],
        text: '104',
        mode: 'exact',
      }),
    ).toEqual(['104']);
  });

  it('filters nested object fields', () => {
    expect(matchIds([where(['profile', 'city'], 'equals', 'Berlin')])).toEqual([101, '104']);
    expect(matchIds([where(['profile', 'city'], 'is_missing')])).toEqual([103]);
    expect(matchIds([where(['profile'], 'is_null')])).toEqual([103]);
  });

  it('matches array fields when any element matches', () => {
    expect(matchIds([where(['orders', EACH, 'status'], 'equals', 'pending')])).toEqual([101]);
    expect(matchIds([where(['orders', EACH, 'total'], 'gt', '40')])).toEqual([102]);
    expect(matchIds([where(['orders', EACH, 'status'], 'is_missing')])).toEqual(['104']);
  });
});

describe('unexpected record shapes', () => {
  const records = [null, 42, 'text', [1, 2], { id: 1 }];

  it('filters non-object records without throwing', () => {
    expect(
      filterRecords(records, {
        search: { path: ['id'], text: '1', mode: 'exact' },
        conditions: [],
      }),
    ).toEqual([4]);
    expect(
      filterRecords(records, { search: null, conditions: [where(['id'], 'is_missing')] }),
    ).toEqual([0, 1, 2, 3]);
  });

  it('filters primitive collections through the empty path', () => {
    const fruits = ['apple', 'banana', ''];
    expect(
      filterRecords(fruits, { search: null, conditions: [where([], 'contains', 'an')] }),
    ).toEqual([1]);
    expect(filterRecords(fruits, { search: null, conditions: [where([], 'is_empty')] })).toEqual([
      2,
    ]);
  });
});

describe('isQueryActive', () => {
  it('ignores empty searches and incomplete conditions', () => {
    const search: FieldSearch = { path: null, text: ' ', mode: 'contains' };
    expect(isQueryActive({ search, conditions: [where(['age'], 'gt', '')] })).toBe(false);
    expect(isQueryActive({ search, conditions: [where(['age'], 'is_null')] })).toBe(true);
    expect(isQueryActive({ search: { ...search, text: 'a' }, conditions: [] })).toBe(true);
  });
});

describe('operatorsForTypes', () => {
  it('offers operators that fit the detected types', () => {
    expect(operatorsForTypes(['number'])).toEqual([
      'equals',
      'not_equals',
      'gt',
      'lt',
      'gte',
      'lte',
      'is_null',
      'is_missing',
    ]);
    expect(operatorsForTypes(['boolean'])).toEqual([
      'is_true',
      'is_false',
      'is_null',
      'is_missing',
    ]);
    expect(operatorsForTypes(['string', 'null'])).toEqual([
      'equals',
      'not_equals',
      'contains',
      'starts_with',
      'is_empty',
      'is_not_empty',
      'is_null',
      'is_missing',
    ]);
  });
});

describe('rankSearchFields', () => {
  it('puts identifier-like fields first', () => {
    const { fields } = inferSchema([
      { name: 'a', count: 2, paid: 10, userId: 7, uuid: 'x', tags: ['t'] },
    ]);
    expect(rankSearchFields(fields).map((field) => field.key)).toEqual([
      'uuid',
      'userId',
      'name',
      'count',
      'paid',
      'tags[]',
    ]);
  });

  it('prefers a top-level id over nested ones', () => {
    const { fields } = inferSchema([{ owner: { id: 1 }, id: 2 }]);
    expect(rankSearchFields(fields)[0]?.key).toBe('id');
  });
});
