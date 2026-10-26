import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef } from 'react';
import { isJsonObject, resolvePath, type SchemaField } from '../../core';
import { fieldLabel, formatJsonValue, truncateText } from '../format';

interface TableViewProps {
  records: readonly unknown[];
  matches: readonly number[];
  fields: readonly SchemaField[];
  onOpenRecord: (index: number) => void;
}

interface Column {
  field: SchemaField;
  label: string;
  width: number;
}

interface CellContent {
  text: string;
  muted: boolean;
}

const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 24;
const OVERSCAN_ROWS = 12;
const INDEX_COLUMN_WIDTH = 56;
const MAX_COLUMNS = 40;
const MAX_COLUMN_DEPTH = 3;
const WIDTH_SAMPLE_SIZE = 50;
const CHAR_WIDTH = 7;
const CELL_PADDING = 16;
const MIN_COLUMN_WIDTH = 64;
const MAX_COLUMN_WIDTH = 260;
const MISSING_CELL: CellContent = { text: '', muted: true };

export function TableView({ records, matches, fields, onOpenRecord }: TableViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => getColumns(fields, records), [fields, records]);
  const virtualizer = useVirtualizer({
    count: matches.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
    scrollMargin: HEADER_HEIGHT,
  });
  const gridTemplateColumns = [INDEX_COLUMN_WIDTH, ...columns.map((column) => column.width)]
    .map((width) => `${width}px`)
    .join(' ');
  const totalWidth = columns.reduce((sum, column) => sum + column.width, INDEX_COLUMN_WIDTH);

  return (
    <div
      ref={scrollRef}
      role="table"
      aria-label="Matching records"
      aria-rowcount={matches.length + 1}
      className="h-full overflow-auto font-mono text-[11px]"
    >
      <div style={{ width: totalWidth, minWidth: '100%' }}>
        <div
          role="row"
          className="sticky top-0 z-10 grid border-b border-line bg-surface-alt font-sans font-semibold"
          style={{ gridTemplateColumns, height: HEADER_HEIGHT }}
        >
          <div role="columnheader" className="px-1.5 leading-6 text-muted">
            #
          </div>
          {columns.map((column) => (
            <div
              key={column.field.key}
              role="columnheader"
              title={column.label}
              className="truncate border-l border-line px-1.5 leading-6"
            >
              {column.label}
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((item) => {
            const recordIndex = matches[item.index];
            if (recordIndex === undefined) return null;
            const record = records[recordIndex];
            return (
              <div
                key={item.key}
                role="row"
                aria-rowindex={item.index + 2}
                tabIndex={0}
                title="Open in JSON view"
                className="absolute top-0 left-0 grid w-full cursor-pointer border-b border-line/60 hover:bg-hover focus-visible:bg-selected"
                style={{
                  gridTemplateColumns,
                  height: ROW_HEIGHT,
                  transform: `translateY(${item.start - HEADER_HEIGHT}px)`,
                }}
                onClick={() => onOpenRecord(recordIndex)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onOpenRecord(recordIndex);
                }}
              >
                <div role="cell" className="px-1.5 leading-[21px] text-muted tabular-nums">
                  {recordIndex}
                </div>
                {columns.map((column) => {
                  const cell = getCell(record, column.field);
                  return (
                    <div
                      key={column.field.key}
                      role="cell"
                      className={`truncate border-l border-line/60 px-1.5 leading-[21px] ${
                        cell.muted ? 'text-muted' : ''
                      }`}
                    >
                      {cell.text}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getColumns(fields: readonly SchemaField[], records: readonly unknown[]): Column[] {
  const sample = records.slice(0, WIDTH_SAMPLE_SIZE);
  return fields
    .filter(
      (field) =>
        !field.inArray &&
        field.path.length <= MAX_COLUMN_DEPTH &&
        field.types.some((type) => type !== 'object'),
    )
    .slice(0, MAX_COLUMNS)
    .map((field) => {
      const label = fieldLabel(field);
      const widestText = sample.reduce<number>(
        (widest, record) => Math.max(widest, getCell(record, field).text.length),
        label.length,
      );
      const width = Math.min(
        Math.max(widestText * CHAR_WIDTH + CELL_PADDING, MIN_COLUMN_WIDTH),
        MAX_COLUMN_WIDTH,
      );
      return { field, label, width };
    });
}

/** Missing renders blank, null and "" render as muted literals so the three stay distinguishable. */
function getCell(record: unknown, field: SchemaField): CellContent {
  const { values, missing } = resolvePath(record, field.path);
  const [value] = values;
  if (missing || values.length === 0) return MISSING_CELL;
  if (value === null) return { text: 'null', muted: true };
  if (value === '') return { text: '""', muted: true };
  if (typeof value === 'string') return { text: truncateText(value), muted: false };
  return { text: formatJsonValue(value), muted: Array.isArray(value) || isJsonObject(value) };
}
