import { describe, expect, it } from 'vitest';
import { inferSchema, type SchemaField } from '../src/core';

const byKey = (fields: SchemaField[]) => new Map(fields.map((field) => [field.key, field]));

describe('inferSchema', () => {
  it('detects field types and nullable fields', () => {
    const { fields } = inferSchema([
      { id: 101, name: 'Alice', age: 28 },
      { id: 102, name: null, age: 35 },
    ]);
    expect(fields.map(({ key, types }) => ({ key, types }))).toEqual([
      { key: 'id', types: ['number'] },
      { key: 'name', types: ['string', 'null'] },
      { key: 'age', types: ['number'] },
    ]);
  });

  it('tracks how often a field is present', () => {
    const schema = inferSchema([{ id: 1, email: 'a@example.com' }, { id: 2 }]);
    expect(schema.sampleSize).toBe(2);
    expect(byKey(schema.fields).get('email')?.presence).toBe(1);
    expect(byKey(schema.fields).get('id')?.presence).toBe(2);
  });

  it('describes nested objects and arrays of objects', () => {
    const fields = byKey(
      inferSchema([
        {
          profile: { city: 'Berlin' },
          orders: [{ status: 'paid', total: 10 }, { status: 'open' }],
        },
        { profile: null, orders: [] },
      ]).fields,
    );
    expect(fields.get('profile')?.types).toEqual(['null', 'object']);
    expect(fields.get('profile.city')).toMatchObject({ types: ['string'], inArray: false });
    expect(fields.get('orders')?.types).toEqual(['array']);
    expect(fields.get('orders[].status')).toMatchObject({
      types: ['string'],
      inArray: true,
      presence: 1,
    });
    expect(fields.get('orders[].total')?.types).toEqual(['number']);
  });

  it('merges heterogeneous values, including bigint as number', () => {
    const fields = byKey(
      inferSchema([
        { value: 1 },
        { value: 'x' },
        { value: true },
        { value: [1] },
        { value: 10n ** 20n },
      ]).fields,
    );
    expect(fields.get('value')?.types).toEqual(['string', 'number', 'boolean', 'array']);
    expect(fields.get('value[]')?.types).toEqual(['number']);
  });

  it('describes collections of primitives with an empty path', () => {
    expect(inferSchema(['a', 'b', null]).fields).toEqual([
      { key: '', path: [], types: ['string', 'null'], presence: 3, inArray: false },
    ]);
  });

  it('samples large collections across their whole length', () => {
    const records = Array.from({ length: 10_000 }, (_, index) =>
      index < 9_000 ? { id: index } : { id: index, late: true },
    );
    const schema = inferSchema(records);
    expect(schema.sampleSize).toBe(1_000);
    expect(schema.recordCount).toBe(10_000);
    expect(byKey(schema.fields).has('late')).toBe(true);
  });
});
