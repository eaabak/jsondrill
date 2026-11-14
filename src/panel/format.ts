import { isJsonObject, type SchemaField } from '../core';
import { getRequestSpeed } from '../network/insights';

const MAX_DISPLAY_CHARS = 300;
const PREVIEW_KEYS = 5;

export function fieldLabel(field: SchemaField): string {
  return field.key === '' ? '(value)' : field.key;
}

export function describeField(field: SchemaField, sampleSize: number): string {
  const types: string[] = [...field.types];
  if (!field.inArray && field.presence < sampleSize) types.push('missing');
  return `${fieldLabel(field)} (${types.join(' | ')})`;
}

export function formatCount(count: number, noun: string): string {
  return `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : 's'}`;
}

export function truncateText(text: string, maxChars = MAX_DISPLAY_CHARS): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

/** JSON-style rendering of a single value; containers are summarised, never expanded. */
export function formatJsonValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(truncateText(value));
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (isJsonObject(value)) return '{…}';
  return String(value);
}

export function previewContainer(value: unknown): string {
  if (!isJsonObject(value)) return formatJsonValue(value);
  const keys = Object.keys(value);
  const entries = keys
    .slice(0, PREVIEW_KEYS)
    .map((key) => `${key}: ${formatJsonValue(value[key])}`);
  if (keys.length > PREVIEW_KEYS) entries.push('…');
  return `{${entries.join(', ')}}`;
}

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hour12: false,
});

export function formatTime(timestamp: number): string {
  return TIME_FORMAT.format(timestamp);
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== '' ? error.message : fallback;
}

const SPEED_CLASSES = { normal: 'text-muted', slow: 'text-warning', 'very-slow': 'text-error' };

export function speedClass(duration: number | null): string {
  return SPEED_CLASSES[getRequestSpeed(duration)];
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

export function formatDateTime(timestamp: number): string {
  return DATE_TIME_FORMAT.format(timestamp);
}

const RELATIVE_UNITS = [
  { unit: 'day', ms: 86_400_000 },
  { unit: 'hour', ms: 3_600_000 },
  { unit: 'minute', ms: 60_000 },
  { unit: 'second', ms: 1000 },
] as const;
const RELATIVE_FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

/** "in 12 minutes" or "3 hours ago", relative to `now`. */
export function formatRelativeTime(timestamp: number, now: number): string {
  const delta = timestamp - now;
  const { unit, ms } =
    RELATIVE_UNITS.find((candidate) => Math.abs(delta) >= candidate.ms) ?? RELATIVE_UNITS[3];
  return RELATIVE_FORMAT.format(Math.trunc(delta / ms), unit);
}
