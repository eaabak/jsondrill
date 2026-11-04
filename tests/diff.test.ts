import { describe, expect, it } from 'vitest';
import { countChangedFields, diffCollections, diffSchemas, inferSchema } from '../src/core';

function wide(value: number) {
  return Object.fromEntries(Array.from({ length: 150 }, (_, index) => [`f${index}`, value]));
}

describe('diffCollections', () => {
  const before = [
    { id: 1, name: 'Ada', status: 'active', tags: ['a'] },
    { id: 2, name: 'Linus', status: 'active', tags: [] },
    { id: 3, name: 'Grace', status: 'banned', tags: [] },
  ];

  it('pairs records by their identifier, even when the order changes', () => {
    const after = [
      { id: 4, name: 'Alan', status: 'active', tags: [] },
      { id: 2, name: 'Linus', status: 'banned', tags: [] },
      { id: 1, name: 'Ada', status: 'active', tags: ['a', 'b'] },
    ];
    const diff = diffCollections(before, after);

    expect(diff.match).toEqual({ kind: 'field', field: 'id' });
    expect(diff.counts).toEqual({ added: 1, removed: 1, changed: 2, unchanged: 0 });
    expect(diff.records.map((record) => [record.kind, record.key])).toEqual([
      ['added', '4'],
      ['changed', '2'],
      ['changed', '1'],
      ['removed', '3'],
    ]);
    expect(diff.records[1]?.changes).toEqual([
      { path: 'status', field: 'status', before: 'active', after: 'banned' },
    ]);
    expect(diff.records[2]?.changes).toEqual([
      { path: 'tags[1]', field: 'tags[]', before: undefined, after: 'b' },
    ]);
  });

  it('reports identical collections as unchanged', () => {
    const diff = diffCollections(before, structuredClone(before));
    expect(diff.records).toEqual([]);
    expect(diff.structure).toEqual([]);
    expect(diff.counts.unchanged).toBe(3);
  });

  it('pairs ids across a number to string change', () => {
    const diff = diffCollections(
      [
        { id: 7, v: 1 },
        { id: 8, v: 1 },
      ],
      [
        { id: '8', v: 2 },
        { id: '7', v: 1 },
      ],
    );
    expect(diff.match).toEqual({ kind: 'field', field: 'id' });
    expect(diff.counts).toMatchObject({ changed: 2, added: 0, removed: 0 });
  });

  it('falls back to positions without a unique identifier', () => {
    const diff = diffCollections([{ id: 1 }, { id: 1 }], [{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(diff.match).toEqual({ kind: 'position' });
    expect(diff.records.map((record) => [record.kind, record.key])).toEqual([
      ['changed', '#1'],
      ['added', '#2'],
    ]);
  });

  it('compares single objects field by field', () => {
    const diff = diffCollections(
      [{ id: 1, profile: { city: 'Oslo', phone: '1' } }],
      [{ id: 2, profile: { city: 'Rome' } }],
    );
    expect(diff.match).toEqual({ kind: 'position' });
    expect(diff.records[0]?.changes.map((change) => change.path)).toEqual([
      'id',
      'profile.city',
      'profile.phone',
    ]);
  });

  it('keeps large integer identifiers exact', () => {
    const diff = diffCollections(
      [
        { id: 12345678901234567890n, v: 1 },
        { id: 12345678901234567891n, v: 1 },
      ],
      [
        { id: 12345678901234567891n, v: 2 },
        { id: 12345678901234567890n, v: 1 },
      ],
    );
    expect(diff.records).toMatchObject([{ kind: 'changed', key: '12345678901234567891' }]);
  });

  it('caps the changes listed for one record', () => {
    const diff = diffCollections([wide(1)], [wide(2)]);
    expect(diff.records[0]?.changes).toHaveLength(100);
    expect(diff.records[0]?.truncated).toBe(true);
  });
});

describe('countChangedFields', () => {
  it('counts each field once per record, most frequent first', () => {
    const diff = diffCollections(
      [
        { id: 1, status: 'a', tags: ['x', 'y'] },
        { id: 2, status: 'a', tags: [] },
      ],
      [
        { id: 1, status: 'b', tags: ['z', 'w'] },
        { id: 2, status: 'b', tags: [] },
      ],
    );
    expect(countChangedFields(diff.records)).toEqual([
      ['status', 2],
      ['tags[]', 1],
    ]);
  });
});

describe('diffSchemas', () => {
  it('lists removed, changed and added fields', () => {
    const before = inferSchema([{ id: 1, price: 10, profile: { phone: '1', city: 'Oslo' } }]);
    const after = inferSchema([
      { id: 1, price: '10', profile: { city: null }, meta: { source: 'api', tags: ['x'] } },
    ]);
    expect(diffSchemas(before, after)).toEqual([
      { kind: 'removed', field: 'profile.phone', before: ['string'], after: [] },
      { kind: 'changed', field: 'price', before: ['number'], after: ['string'] },
      { kind: 'changed', field: 'profile.city', before: ['string'], after: ['null'] },
      { kind: 'added', field: 'meta', before: [], after: ['object'] },
    ]);
  });

  it('flags fields that became nullable', () => {
    const before = inferSchema([{ email: 'a' }, { email: 'b' }]);
    const after = inferSchema([{ email: 'a' }, { email: null }]);
    expect(diffSchemas(before, after)).toEqual([
      { kind: 'changed', field: 'email', before: ['string'], after: ['string', 'null'] },
    ]);
  });
});
