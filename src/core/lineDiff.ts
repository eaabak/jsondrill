import { isJsonObject, stringifyJson } from './json';

export type LineKind = 'same' | 'removed' | 'added';
export type LineValueType = 'string' | 'number' | 'literal' | 'punctuation';

export interface DiffLine {
  kind: LineKind;
  depth: number;
  key: string;
  text: string;
  valueType: LineValueType;
  comma: boolean;
  /** Differs from `comma` on unchanged lines whose next sibling was added or removed. */
  commaBefore: boolean;
  /** A primitive replaced in place, so its value can be highlighted. */
  emphasis: boolean;
  beforeLine: number | null;
  afterLine: number | null;
}

export type DiffSegment = { kind: 'lines' | 'fold'; lines: DiffLine[] };

export interface SplitRow {
  before: DiffLine | null;
  after: DiffLine | null;
}

export const MAX_DIFF_LINES = 2_000;
const FOLD_CONTEXT = 3;
const MIN_FOLD = 4;

// `undefined` on one side means the value is missing there.
export function diffLines(
  before: unknown,
  after: unknown,
  maxLines = MAX_DIFF_LINES,
): { lines: DiffLine[]; truncated: boolean } {
  const writer = new LineWriter(maxLines);
  writeDiff(writer, before, after, 0, '', false, false);
  return { lines: writer.lines, truncated: writer.truncated };
}

export function foldUnchangedLines(lines: readonly DiffLine[]): DiffSegment[] {
  const keep = lines.map(() => false);
  lines.forEach((line, index) => {
    if (line.kind === 'same') return;
    const last = Math.min(lines.length - 1, index + FOLD_CONTEXT);
    for (let near = Math.max(0, index - FOLD_CONTEXT); near <= last; near += 1) keep[near] = true;
  });

  const segments: DiffSegment[] = [];
  let start = 0;
  while (start < lines.length) {
    let end = start;
    while (end < lines.length && keep[end] === keep[start]) end += 1;
    const run = lines.slice(start, end);
    const kind = !keep[start] && run.length >= MIN_FOLD ? 'fold' : 'lines';
    const previous = segments.at(-1);
    if (kind === 'lines' && previous?.kind === 'lines') previous.lines.push(...run);
    else segments.push({ kind, lines: run });
    start = end;
  }
  return segments;
}

export function toSplitRows(lines: readonly DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line?.kind === 'same') {
      rows.push({ before: line, after: line });
      index += 1;
      continue;
    }
    const removed: DiffLine[] = [];
    const added: DiffLine[] = [];
    while (index < lines.length && lines[index]?.kind !== 'same') {
      const changed = lines[index];
      if (changed?.kind === 'removed') removed.push(changed);
      else if (changed) added.push(changed);
      index += 1;
    }
    for (let row = 0; row < Math.max(removed.length, added.length); row += 1) {
      rows.push({ before: removed[row] ?? null, after: added[row] ?? null });
    }
  }
  return rows;
}

class LineWriter {
  readonly lines: DiffLine[] = [];
  truncated = false;
  private beforeLine = 0;
  private afterLine = 0;

  constructor(private readonly maxLines: number) {}

  push(line: Omit<DiffLine, 'beforeLine' | 'afterLine'>): void {
    if (this.lines.length >= this.maxLines) {
      this.truncated = true;
      return;
    }
    const hasBefore = line.kind !== 'added';
    const hasAfter = line.kind !== 'removed';
    if (hasBefore) this.beforeLine += 1;
    if (hasAfter) this.afterLine += 1;
    this.lines.push({
      ...line,
      beforeLine: hasBefore ? this.beforeLine : null,
      afterLine: hasAfter ? this.afterLine : null,
    });
  }
}

function writeDiff(
  writer: LineWriter,
  before: unknown,
  after: unknown,
  depth: number,
  key: string,
  commaBefore: boolean,
  commaAfter: boolean,
): void {
  if (writer.truncated) return;
  if (before === undefined) {
    writeValue(writer, 'added', after, depth, key, commaAfter, false);
    return;
  }
  if (after === undefined) {
    writeValue(writer, 'removed', before, depth, key, commaBefore, false);
    return;
  }

  if (isJsonObject(before) && isJsonObject(after)) {
    const keys = mergeKeys(Object.keys(before), Object.keys(after));
    if (keys.length === 0) {
      writer.push(bracketLine('same', depth, key, '{}', commaAfter, commaBefore));
      return;
    }
    const lastBefore = Object.keys(before).at(-1);
    const lastAfter = Object.keys(after).at(-1);
    writer.push(bracketLine('same', depth, key, '{', false));
    for (const child of keys) {
      writeDiff(
        writer,
        before[child],
        after[child],
        depth + 1,
        `${JSON.stringify(child)}: `,
        child !== lastBefore,
        child !== lastAfter,
      );
    }
    writer.push(bracketLine('same', depth, '', '}', commaAfter, commaBefore));
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    if (length === 0) {
      writer.push(bracketLine('same', depth, key, '[]', commaAfter, commaBefore));
      return;
    }
    writer.push(bracketLine('same', depth, key, '[', false));
    for (let index = 0; index < length; index += 1) {
      writeDiff(
        writer,
        before[index],
        after[index],
        depth + 1,
        '',
        index < before.length - 1,
        index < after.length - 1,
      );
    }
    writer.push(bracketLine('same', depth, '', ']', commaAfter, commaBefore));
    return;
  }

  if (Object.is(before, after)) {
    writeValue(writer, 'same', after, depth, key, commaAfter, false, commaBefore);
    return;
  }
  const emphasis = isPrimitive(before) && isPrimitive(after);
  writeValue(writer, 'removed', before, depth, key, commaBefore, emphasis);
  writeValue(writer, 'added', after, depth, key, commaAfter, emphasis);
}

function writeValue(
  writer: LineWriter,
  kind: LineKind,
  value: unknown,
  depth: number,
  key: string,
  comma: boolean,
  emphasis: boolean,
  commaBefore = comma,
): void {
  if (writer.truncated) return;
  if (isJsonObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      writer.push(bracketLine(kind, depth, key, '{}', comma, commaBefore));
      return;
    }
    writer.push(bracketLine(kind, depth, key, '{', false));
    keys.forEach((child, index) =>
      writeValue(
        writer,
        kind,
        value[child],
        depth + 1,
        `${JSON.stringify(child)}: `,
        index < keys.length - 1,
        false,
      ),
    );
    writer.push(bracketLine(kind, depth, '', '}', comma, commaBefore));
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      writer.push(bracketLine(kind, depth, key, '[]', comma, commaBefore));
      return;
    }
    writer.push(bracketLine(kind, depth, key, '[', false));
    value.forEach((item, index) =>
      writeValue(writer, kind, item, depth + 1, '', index < value.length - 1, false),
    );
    writer.push(bracketLine(kind, depth, '', ']', comma, commaBefore));
    return;
  }
  writer.push({
    kind,
    depth,
    key,
    text: stringifyJson(value, 0),
    valueType: getValueType(value),
    comma,
    commaBefore,
    emphasis,
  });
}

function bracketLine(
  kind: LineKind,
  depth: number,
  key: string,
  text: string,
  comma: boolean,
  commaBefore = comma,
) {
  return {
    kind,
    depth,
    key,
    text,
    valueType: 'punctuation' as const,
    comma,
    commaBefore,
    emphasis: false,
  };
}

// Keys follow the newer order; a removed key stays next to the key that preceded it before.
function mergeKeys(beforeKeys: readonly string[], afterKeys: readonly string[]): string[] {
  const merged = [...afterKeys];
  const afterSet = new Set(afterKeys);
  let insertAt = 0;
  for (const key of beforeKeys) {
    if (afterSet.has(key)) {
      insertAt = merged.indexOf(key) + 1;
    } else {
      merged.splice(insertAt, 0, key);
      insertAt += 1;
    }
  }
  return merged;
}

function isPrimitive(value: unknown): boolean {
  return value === null || (typeof value !== 'object' && value !== undefined);
}

function getValueType(value: unknown): LineValueType {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number' || typeof value === 'bigint') return 'number';
  return 'literal';
}
