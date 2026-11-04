import { describe, expect, it } from 'vitest';
import { diffLines, foldUnchangedLines, toSplitRows, type DiffLine } from '../src/core';

const sign = { same: ' ', removed: '-', added: '+' } as const;

function render(lines: readonly DiffLine[]): string[] {
  return lines.map(
    (line) =>
      `${sign[line.kind]} ${'  '.repeat(line.depth)}${line.key}${line.text}${line.comma ? ',' : ''}`,
  );
}

describe('diffLines', () => {
  it('shows a changed value as a removed and an added line', () => {
    const { lines } = diffLines(
      { id: 1, status: 'active', tags: ['a'] },
      { id: 1, status: 'banned', tags: ['a', 'b'] },
    );
    expect(render(lines)).toEqual([
      '  {',
      '    "id": 1,',
      '-   "status": "active",',
      '+   "status": "banned",',
      '    "tags": [',
      '      "a",',
      '+     "b"',
      '    ]',
      '  }',
    ]);
    expect(lines.filter((line) => line.emphasis).map((line) => line.kind)).toEqual([
      'removed',
      'added',
    ]);
  });

  it('numbers lines on each side like a unified diff', () => {
    const { lines } = diffLines({ a: 1, b: 2 }, { a: 1, c: 3 });
    expect(lines.map((line) => [line.kind, line.beforeLine, line.afterLine])).toEqual([
      ['same', 1, 1],
      ['same', 2, 2],
      ['removed', 3, null],
      ['added', null, 3],
      ['same', 4, 4],
    ]);
  });

  it('keeps a removed key next to its previous neighbour', () => {
    const { lines } = diffLines({ a: 1, gone: true, b: 2 }, { b: 2, a: 1 });
    expect(render(lines)).toEqual(['  {', '    "b": 2,', '    "a": 1', '-   "gone": true,', '  }']);
  });

  it('renders added and removed records entirely', () => {
    expect(render(diffLines(undefined, { id: 2, tags: [] }).lines)).toEqual([
      '+ {',
      '+   "id": 2,',
      '+   "tags": []',
      '+ }',
    ]);
    expect(render(diffLines(['x'], undefined).lines)).toEqual(['- [', '-   "x"', '- ]']);
  });

  it('replaces a value whose type changed without highlighting it', () => {
    const { lines } = diffLines({ v: { a: 1 } }, { v: 'text' });
    expect(render(lines)).toEqual([
      '  {',
      '-   "v": {',
      '-     "a": 1',
      '-   }',
      '+   "v": "text"',
      '  }',
    ]);
    expect(lines.some((line) => line.emphasis)).toBe(false);
  });

  it('keeps large integers exact', () => {
    const { lines } = diffLines({ id: 12345678901234567890n }, { id: 12345678901234567891n });
    expect(lines.map((line) => line.text)).toContain('12345678901234567891');
  });

  it('stops at the line limit', () => {
    const big = Array.from({ length: 50 }, (_, index) => index);
    const { lines, truncated } = diffLines(undefined, big, 10);
    expect(lines).toHaveLength(10);
    expect(truncated).toBe(true);
  });
});

describe('diffLines commas', () => {
  it('keeps the earlier comma of an unchanged line whose next sibling was removed', () => {
    const { lines } = diffLines({ a: 1, b: 2 }, { a: 1 });
    const unchanged = lines.find((line) => line.key === '"a": ');
    expect(unchanged).toMatchObject({ kind: 'same', comma: false, commaBefore: true });
  });
});

describe('foldUnchangedLines', () => {
  it('folds long unchanged runs and keeps context around changes', () => {
    const before = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [`k${index}`, index]),
    );
    const { lines } = diffLines(before, { ...before, k10: 'changed' });
    const segments = foldUnchangedLines(lines);
    expect(segments.map((segment) => [segment.kind, segment.lines.length])).toEqual([
      ['fold', 8],
      ['lines', 8],
      ['fold', 7],
    ]);
  });

  it('does not fold short runs', () => {
    const { lines } = diffLines({ a: 1, b: 2 }, { a: 1, b: 3 });
    expect(foldUnchangedLines(lines)).toEqual([{ kind: 'lines', lines }]);
  });
});

describe('toSplitRows', () => {
  it('pairs removed lines with the added lines that replace them', () => {
    const { lines } = diffLines({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
    const rows = toSplitRows(lines).map(({ before, after }) => [
      before ? `${before.key}${before.text}` : null,
      after ? `${after.key}${after.text}` : null,
    ]);
    expect(rows).toEqual([
      ['{', '{'],
      ['"a": 1', '"a": 1'],
      ['"b": 2', '"b": 3'],
      [null, '"c": 4'],
      ['}', '}'],
    ]);
  });
});
