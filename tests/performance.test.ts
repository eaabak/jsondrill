import { describe, expect, it } from 'vitest';
import { EACH, filterRecords, inferSchema, parseJson, stringifyJson } from '../src/core';

const RECORD_COUNT = 20_000;
// Generous enough for slow CI machines while still catching accidental quadratic behaviour.
const BUDGET_MS = 2_000;
const CITIES = ['Berlin', 'Paris', 'Lisbon', 'Oslo'];

function createRecords() {
  return Array.from({ length: RECORD_COUNT }, (_, index) => ({
    id: index + 1,
    name: `user-${index}`,
    email: index % 10 === 0 ? null : `user${index}@example.com`,
    age: 18 + (index % 60),
    active: index % 3 === 0,
    profile: { city: CITIES[index % CITIES.length], score: index % 100 },
    orders: Array.from({ length: index % 4 }, (_item, order) => ({
      status: order % 2 === 0 ? 'paid' : 'pending',
      total: order * 10,
    })),
  }));
}

describe('performance sanity check', () => {
  it(`parses, profiles and filters ${RECORD_COUNT.toLocaleString('en-US')} records within budget`, () => {
    const text = stringifyJson(createRecords());
    const started = performance.now();

    const parsed = parseJson(text);
    if (!parsed.ok || !Array.isArray(parsed.value)) throw new Error('Expected an array');
    const records: unknown[] = parsed.value;
    const schema = inferSchema(records);
    const matches = filterRecords(records, {
      search: { path: ['id'], text: '9', mode: 'contains' },
      conditions: [
        { path: ['age'], operator: 'gte', value: '30' },
        { path: ['orders', EACH, 'status'], operator: 'equals', value: 'pending' },
        { path: ['profile', 'city'], operator: 'equals', value: 'Berlin' },
      ],
    });

    const elapsed = performance.now() - started;
    const expected = createRecords().filter(
      (record) =>
        String(record.id).includes('9') &&
        record.age >= 30 &&
        record.orders.some((order) => order.status === 'pending') &&
        record.profile.city === 'Berlin',
    ).length;

    expect(schema.fields.length).toBeGreaterThan(5);
    expect(matches).toHaveLength(expected);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it('searches every field of every record within budget', () => {
    const records = createRecords();
    const started = performance.now();
    const matches = filterRecords(records, {
      search: { path: null, text: 'user1999', mode: 'contains' },
      conditions: [],
    });
    const elapsed = performance.now() - started;

    expect(matches.length).toBe(
      records.filter((record) => record.email?.includes('user1999')).length,
    );
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});
