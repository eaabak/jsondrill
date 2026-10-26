import { formatBytes } from './format';

export const MAX_JSON_CHARS = 32 * 1024 * 1024;

export type JsonObject = Record<string, unknown>;

export type ParseResult =
  { ok: true; value: unknown; precisionLoss: boolean } | { ok: false; message: string };

interface ReviverContext {
  source?: string;
}

const LONG_DIGIT_RUN = /\d{16,}/;
const INTEGER_LITERAL = /^-?\d+$/;
const ERROR_POSITION = /position (\d+)/;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getSizeLimitError(length: number, maxChars = MAX_JSON_CHARS): string | null {
  if (length <= maxChars) return null;
  return `Response is too large to inspect (${formatBytes(length)}). The limit is ${formatBytes(maxChars)}.`;
}

export function parseJson(text: string, maxChars = MAX_JSON_CHARS): ParseResult {
  const sizeError = getSizeLimitError(text.length, maxChars);
  if (sizeError) return { ok: false, message: sizeError };
  if (text.trim() === '') return { ok: false, message: 'Response body is empty.' };

  let precisionLoss = false;
  const preserveLargeIntegers = (
    _key: string,
    value: unknown,
    context?: ReviverContext,
  ): unknown => {
    if (typeof value !== 'number' || Number.isSafeInteger(value)) return value;
    const source = context?.source;
    if (source === undefined) {
      if (Number.isInteger(value)) precisionLoss = true;
      return value;
    }
    return INTEGER_LITERAL.test(source) ? BigInt(source) : value;
  };

  try {
    // JSON.parse rounds integers beyond 2^53. The source-aware reviver keeps them exact as bigint,
    // but it is several times slower, so it only runs when the text could contain such a literal.
    const value: unknown = LONG_DIGIT_RUN.test(text)
      ? JSON.parse(text, preserveLargeIntegers)
      : JSON.parse(text);
    return { ok: true, value, precisionLoss };
  } catch (error) {
    return { ok: false, message: describeParseError(error) };
  }
}

export function stringifyJson(value: unknown, indent = 2): string {
  return JSON.stringify(
    value,
    (_key, item: unknown) => (typeof item === 'bigint' ? JSON.rawJSON(item.toString()) : item),
    indent,
  );
}

function describeParseError(error: unknown): string {
  if (!(error instanceof SyntaxError)) return 'Response could not be parsed as JSON.';
  // Engine messages can quote fragments of the body, so only the position is surfaced.
  const position = ERROR_POSITION.exec(error.message)?.[1];
  return position === undefined
    ? 'Response is not valid JSON.'
    : `Response is not valid JSON (error at character ${position}).`;
}
