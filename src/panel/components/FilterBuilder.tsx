import { Plus, X } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import {
  isNumericOperator,
  isValidConditionValue,
  OPERATOR_LABELS,
  operatorNeedsValue,
  operatorsForTypes,
  type SchemaField,
} from '../../core';
import { describeField } from '../format';
import type { FilterRow, FilterRowChanges } from '../hooks/useRecordQuery';

interface FilterBuilderProps {
  fields: readonly SchemaField[];
  sampleSize: number;
  rows: readonly FilterRow[];
  onAdd: () => void;
  onChange: (id: number, changes: FilterRowChanges) => void;
  onRemove: (id: number) => void;
}

export function FilterBuilder({
  fields,
  sampleSize,
  rows,
  onAdd,
  onChange,
  onRemove,
}: FilterBuilderProps) {
  const fieldOptions = useMemo(
    () =>
      fields.map((field) => (
        <option key={field.key} value={field.key}>
          {describeField(field, sampleSize)}
        </option>
      )),
    [fields, sampleSize],
  );
  const fieldsByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      {rows.length > 0 && (
        <div
          role="group"
          aria-label="Filters"
          className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_1.5rem] items-center gap-1"
        >
          {rows.map((row, index) => {
            const label = `Filter ${index + 1}`;
            const operators = operatorsForTypes(row.field.types);
            const isNumeric = isNumericOperator(row.operator);
            return (
              <Fragment key={row.id}>
                <select
                  className="jd-select w-full font-mono"
                  aria-label={`${label} field`}
                  value={row.field.key}
                  onChange={(event) => {
                    const field = fieldsByKey.get(event.target.value);
                    if (field) onChange(row.id, { field });
                  }}
                >
                  {fieldOptions}
                </select>
                <select
                  className="jd-select w-full"
                  aria-label={`${label} operator`}
                  value={row.operator}
                  onChange={(event) => {
                    const operator = operators.find(
                      (candidate) => candidate === event.target.value,
                    );
                    if (operator) onChange(row.id, { operator });
                  }}
                >
                  {operators.map((operator) => (
                    <option key={operator} value={operator}>
                      {OPERATOR_LABELS[operator]}
                    </option>
                  ))}
                </select>
                {operatorNeedsValue(row.operator) ? (
                  <input
                    className="jd-input w-full font-mono"
                    aria-label={`${label} value`}
                    aria-invalid={!isValidConditionValue(row.operator, row.value)}
                    title={isNumeric ? 'Enter a number' : undefined}
                    inputMode={isNumeric ? 'decimal' : undefined}
                    placeholder={isNumeric ? 'Number' : 'Value'}
                    spellCheck={false}
                    value={row.value}
                    onChange={(event) => onChange(row.id, { value: event.target.value })}
                  />
                ) : (
                  <span aria-hidden />
                )}
                <button
                  type="button"
                  className="jd-icon-button"
                  aria-label={`Remove ${label.toLowerCase()}`}
                  title="Remove filter"
                  onClick={() => onRemove(row.id)}
                >
                  <X size={13} aria-hidden />
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
      <div>
        <button type="button" className="jd-button" onClick={onAdd} disabled={fields.length === 0}>
          <Plus size={12} aria-hidden />
          Add filter
        </button>
      </div>
    </div>
  );
}
