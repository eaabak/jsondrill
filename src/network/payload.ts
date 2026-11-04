import { MAX_JSON_CHARS, parseJson } from '../core';
import { isJsonMimeType, type FormParam, type RequestPayload } from './requests';

export type PayloadContent =
  | { kind: 'json'; data: unknown; precisionLoss: boolean }
  | { kind: 'form'; params: readonly FormParam[] }
  | { kind: 'text'; text: string; note?: string };

// Some clients send JSON as text/plain (e.g. sendBeacon).
const JSON_START = /^\s*[[{]/;

export function readPayload(payload: RequestPayload): PayloadContent {
  const { mimeType, text, params } = payload;
  const declaredJson = isJsonMimeType(mimeType);

  if (declaredJson || JSON_START.test(text)) {
    if (text.length > MAX_JSON_CHARS) {
      return { kind: 'text', text, note: 'The payload is too large to explore as JSON.' };
    }
    const parsed = parseJson(text);
    if (parsed.ok) return { kind: 'json', data: parsed.value, precisionLoss: parsed.precisionLoss };
    if (declaredJson) {
      return { kind: 'text', text, note: 'The payload is not valid JSON, so it is shown as text.' };
    }
  }

  if (params.length > 0) return { kind: 'form', params };
  return { kind: 'text', text };
}
