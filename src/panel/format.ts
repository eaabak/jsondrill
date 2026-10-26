import { isJsonObject, type SchemaField } from '../core';

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

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== '' ? error.message : fallback;
}
