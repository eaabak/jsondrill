import { getSizeLimitError, parseJson } from '../core';

export interface JsonSource {
  name: string;
  size: number;
  data: unknown;
  precisionLoss: boolean;
}

export type SourceResult = { ok: true; source: JsonSource } | { ok: false; message: string };

export const PASTED_NAME = 'Pasted JSON';

export function readSource(name: string, text: string): SourceResult {
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, message: describe(parsed.message) };
  return {
    ok: true,
    source: { name, size: text.length, data: parsed.value, precisionLoss: parsed.precisionLoss },
  };
}

/** Checked before reading, so an oversized file is never loaded into memory. */
export function getFileSizeError(bytes: number): string | null {
  const message = getSizeLimitError(bytes);
  return message === null ? null : describe(message);
}

export function getSourceExportPath(name: string): string {
  return name === PASTED_NAME ? 'pasted' : name.replace(/\.[^.]+$/, '');
}

// The parser words its messages for network responses.
function describe(message: string): string {
  return message.replace(/^Response(?: body)?/, 'The content');
}
