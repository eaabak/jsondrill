import { describe, expect, it } from 'vitest';
import { findCollections, getCollectionRecords } from '../src/core';

const labels = (root: unknown) => findCollections(root).map((collection) => collection.label);

describe('findCollections', () => {
  it('uses a root array directly', () => {
    expect(findCollections([{ id: 1 }, { id: 2 }])).toEqual([
      { key: '', path: [], label: '(root)', size: 2 },
    ]);
  });

  it('discovers nested collections inside wrapper objects', () => {
    const response = { meta: { page: 1 }, data: { users: [{ id: 1 }, { id: 2 }] } };
    const [first] = findCollections(response);
    expect(first).toMatchObject({ label: 'data.users', size: 2 });
    expect(getCollectionRecords(response, first.path)).toBe(response.data.users);
  });

  it('ranks record arrays by size, then the root object, then other arrays', () => {
    const response = { tags: ['a', 'b', 'c'], items: [{ id: 1 }], related: [{ id: 2 }, { id: 3 }] };
    expect(labels(response)).toEqual(['related', 'items', '(root object)', 'tags']);
  });

  it('treats objects without arrays and primitives as a single record', () => {
    expect(labels({ id: 1, name: 'x' })).toEqual(['(root object)']);
    expect(getCollectionRecords({ id: 1 }, [])).toEqual([{ id: 1 }]);
    expect(labels(42)).toEqual(['(root)']);
    expect(getCollectionRecords(42, [])).toEqual([42]);
  });
});
