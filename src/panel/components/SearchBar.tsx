import { Search } from 'lucide-react';
import type { SchemaField, SearchMode } from '../../core';
import { fieldLabel } from '../format';
import { SegmentedControl, type SegmentOption } from './SegmentedControl';

interface SearchBarProps {
  inputId: string;
  fields: readonly SchemaField[];
  field: SchemaField | null;
  text: string;
  mode: SearchMode;
  onFieldChange: (key: string | null) => void;
  onTextChange: (text: string) => void;
  onModeChange: (mode: SearchMode) => void;
}

// Formatted field paths never equal "*", so it cannot collide with a real field key.
const ANY_FIELD = '*';

const MATCH_OPTIONS: readonly SegmentOption<SearchMode>[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'exact', label: 'Exact' },
];

export function SearchBar({
  inputId,
  fields,
  field,
  text,
  mode,
  onFieldChange,
  onTextChange,
  onModeChange,
}: SearchBarProps) {
  const selectedLabel = field ? fieldLabel(field) : 'Any field';

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <div className="flex min-w-0 flex-1 basis-72">
        <select
          className="jd-select relative w-48 max-w-[45%] shrink-0 rounded-r-none font-mono focus-visible:z-10"
          aria-label="Search field"
          title={selectedLabel}
          value={field?.key ?? ANY_FIELD}
          onChange={(event) =>
            onFieldChange(event.target.value === ANY_FIELD ? null : event.target.value)
          }
        >
          <option value={ANY_FIELD}>Any field</option>
          {fields.map((candidate) => (
            <option key={candidate.key} value={candidate.key}>
              {fieldLabel(candidate)}
            </option>
          ))}
        </select>
        <div className="relative -ml-px min-w-0 flex-1">
          <Search
            size={12}
            className="pointer-events-none absolute top-1/2 left-1.5 z-20 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            id={inputId}
            type="search"
            className="jd-input relative w-full rounded-l-none pl-5 font-mono focus-visible:z-10"
            placeholder={field ? `Search ${selectedLabel}` : 'Search all fields'}
            autoComplete="off"
            spellCheck={false}
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
          />
        </div>
      </div>
      <SegmentedControl
        label="Match mode"
        value={mode}
        options={MATCH_OPTIONS}
        onChange={onModeChange}
      />
    </div>
  );
}
