import { isJsonObject } from './json';

export const EACH: unique symbol = Symbol('each');

export type PathSegment = string | typeof EACH;
export type FieldPath = readonly PathSegment[];

export interface Resolution {
  values: unknown[];
  missing: boolean;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export function appendPathSegment(formatted: string, segment: PathSegment): string {
  if (segment === EACH) return `${formatted}[]`;
  if (IDENTIFIER.test(segment)) return formatted === '' ? segment : `${formatted}.${segment}`;
  return `${formatted}[${JSON.stringify(segment)}]`;
}

export function formatPath(path: FieldPath): string {
  return path.reduce<string>(appendPathSegment, '');
}

/**
 * Collects every value reachable through `path`. `missing` is true when any branch ends
 * before the path does, so a record can both have values and be missing the field in
 * some array elements.
 */
export function resolvePath(root: unknown, path: FieldPath): Resolution {
  let current: unknown[] = [root];
  let missing = false;

  for (const segment of path) {
    const next: unknown[] = [];
    for (const node of current) {
      if (segment === EACH) {
        if (Array.isArray(node)) {
          for (const item of node) next.push(item);
        } else {
          missing = true;
        }
      } else if (isJsonObject(node) && Object.hasOwn(node, segment)) {
        next.push(node[segment]);
      } else {
        missing = true;
      }
    }
    current = next;
  }

  return { values: current, missing };
}
