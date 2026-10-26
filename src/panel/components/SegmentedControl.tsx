import type { ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const lastIndex = options.length - 1;
  return (
    <div role="group" aria-label={label} className="flex shrink-0">
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`jd-button relative aria-pressed:z-10 ${index > 0 ? '-ml-px rounded-l-none' : ''} ${
            index < lastIndex ? 'rounded-r-none' : ''
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
