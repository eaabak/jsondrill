const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;
const BYTES_PER_UNIT = 1024;

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= BYTES_PER_UNIT && unit < BYTE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;

export function formatDuration(milliseconds: number): string {
  const rounded = Math.round(milliseconds);
  if (rounded < MS_PER_SECOND) return `${rounded} ms`;
  if (rounded < MS_PER_MINUTE) return `${trimZero((rounded / MS_PER_SECOND).toFixed(1))} s`;
  return `${trimZero((rounded / MS_PER_MINUTE).toFixed(1))} min`;
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}
