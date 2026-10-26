import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronRight } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { isJsonObject } from '../../core';
import { formatJsonValue, previewContainer } from '../format';

interface JsonTreeProps {
  records: readonly unknown[];
  matches: readonly number[];
  expanded: ReadonlySet<string>;
  revealId: string | null;
  onToggle: (id: string) => void;
}

interface TreeNode {
  id: string;
  depth: number;
  label: string;
  value: unknown;
}

const ROW_HEIGHT = 20;
const INDENT = 14;
const ROW_PADDING = 4;
const OVERSCAN_ROWS = 20;

export function JsonTree({ records, matches, expanded, revealId, onToggle }: JsonTreeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => flattenTree(records, matches, expanded), [records, matches, expanded]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
    initialOffset: () =>
      Math.max(
        rows.findIndex((row) => row.id === revealId),
        0,
      ) * ROW_HEIGHT,
  });

  return (
    <div
      ref={scrollRef}
      role="group"
      aria-label="Matching records as JSON"
      className="h-full overflow-auto font-mono text-[11px]"
    >
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index];
          if (!row) return null;
          return (
            <TreeRow
              key={row.id}
              node={row}
              offset={item.start}
              isExpanded={expanded.has(row.id)}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TreeRowProps {
  node: TreeNode;
  offset: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

function TreeRow({ node, offset, isExpanded, onToggle }: TreeRowProps) {
  const labelClass = node.depth === 0 ? 'text-muted' : 'text-syntax-key';
  return (
    <div
      className="absolute top-0 left-0 flex w-full items-center whitespace-nowrap"
      style={{
        height: ROW_HEIGHT,
        paddingLeft: node.depth * INDENT + ROW_PADDING,
        transform: `translateY(${offset}px)`,
      }}
    >
      {hasChildren(node.value) ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.label}`}
          onClick={() => onToggle(node.id)}
          className="flex h-full shrink-0 items-center gap-0.5 rounded-[2px] pr-0.5 hover:bg-hover"
        >
          <ChevronRight
            size={12}
            className={`shrink-0 text-muted ${isExpanded ? 'rotate-90' : ''}`}
            aria-hidden
          />
          <span className={labelClass}>{node.label}</span>
        </button>
      ) : (
        <span className={`shrink-0 pl-3.5 ${labelClass}`}>{node.label}</span>
      )}
      <span className="shrink-0 text-muted">:&nbsp;</span>
      <ValuePreview value={node.value} isExpanded={isExpanded} />
    </div>
  );
}

function ValuePreview({ value, isExpanded }: { value: unknown; isExpanded: boolean }) {
  if (Array.isArray(value)) return <span className="text-muted">{formatJsonValue(value)}</span>;
  if (isJsonObject(value)) {
    return (
      <span className="min-w-0 truncate text-muted">
        {isExpanded ? '{…}' : previewContainer(value)}
      </span>
    );
  }
  return (
    <span className={`min-w-0 truncate ${getScalarClass(value)}`}>{formatJsonValue(value)}</span>
  );
}

/** Produces only the visible rows; collapsed subtrees are never walked. */
function flattenTree(
  records: readonly unknown[],
  matches: readonly number[],
  expanded: ReadonlySet<string>,
): TreeNode[] {
  const rows: TreeNode[] = [];
  const stack: TreeNode[] = matches
    .map((index) => ({ id: String(index), depth: 0, label: String(index), value: records[index] }))
    .toReversed();

  for (let node = stack.pop(); node; node = stack.pop()) {
    rows.push(node);
    if (!expanded.has(node.id)) continue;
    const children = getChildren(node.value);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const [key, value] = children[index] ?? [];
      if (key === undefined) continue;
      stack.push({
        id: `${node.id}/${encodeURIComponent(key)}`,
        depth: node.depth + 1,
        label: key,
        value,
      });
    }
  }
  return rows;
}

function getChildren(value: unknown): [string, unknown][] {
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item]);
  if (isJsonObject(value)) return Object.entries(value);
  return [];
}

function hasChildren(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return isJsonObject(value) && Object.keys(value).length > 0;
}

function getScalarClass(value: unknown): string {
  if (typeof value === 'string') return 'text-syntax-string';
  if (typeof value === 'number' || typeof value === 'bigint') return 'text-syntax-number';
  return 'text-syntax-keyword';
}
