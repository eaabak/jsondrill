import { isJsonObject } from './json';
import { formatPath, resolvePath } from './paths';

export interface Collection {
  key: string;
  path: readonly string[];
  label: string;
  size: number;
}

const MAX_DEPTH = 6;
const MAX_VISITED_NODES = 5_000;
const RECORD_PROBE_SIZE = 20;

/**
 * Lists arrays reachable through object keys, best candidate first: arrays of objects
 * by size, then the root object itself, then arrays of primitives or empty arrays.
 */
export function findCollections(root: unknown): [Collection, ...Collection[]] {
  if (!isJsonObject(root)) {
    return [{ key: '', path: [], label: '(root)', size: Array.isArray(root) ? root.length : 1 }];
  }

  const recordArrays: Collection[] = [];
  const otherArrays: Collection[] = [];
  let visited = 0;

  const visit = (value: unknown, path: string[]): void => {
    visited += 1;
    if (Array.isArray(value)) {
      const label = formatPath(path);
      const collection = { key: label, path, label, size: value.length };
      (containsRecords(value) ? recordArrays : otherArrays).push(collection);
      return;
    }
    if (!isJsonObject(value) || path.length >= MAX_DEPTH) return;
    for (const key of Object.keys(value)) {
      if (visited >= MAX_VISITED_NODES) return;
      visit(value[key], [...path, key]);
    }
  };
  visit(root, []);

  const bySize = (a: Collection, b: Collection) => b.size - a.size;
  const rootObject: Collection = { key: '', path: [], label: '(root object)', size: 1 };
  const [best, ...remaining] = recordArrays.toSorted(bySize);
  const others = otherArrays.toSorted(bySize);
  if (!best) return [rootObject, ...others];
  return [best, ...remaining, rootObject, ...others];
}

export function getCollectionRecords(root: unknown, path: readonly string[]): readonly unknown[] {
  const value = resolvePath(root, path).values[0];
  return Array.isArray(value) ? value : [value];
}

function containsRecords(items: readonly unknown[]): boolean {
  return items.slice(0, RECORD_PROBE_SIZE).some(isJsonObject);
}
