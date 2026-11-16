import { formatDuration, isJsonObject, parseJson, stringifyJson } from '../core';
import { graphqlLabel } from './graphql';
import { isSensitiveName, type CapturedRequest, type NameValue } from './requests';

export interface ShareOptions {
  /** Applies to headers, query parameters and body fields with credential-like names. */
  hideSecrets: boolean;
}

export interface BugReportDetails extends ShareOptions {
  /** Null when Chrome no longer has the body. */
  responseBody: string | null;
  graphqlErrors?: readonly string[];
}

export const HIDDEN = '<hidden>';
const MAX_REPORT_BODY_CHARS = 4000;
// Lets whoever reads the report find the call in the server logs.
const TRACE_HEADER = /request-?id|correlation|trace|^cf-ray$/i;
// HTTP/2 pseudo-headers, and `accept-encoding` so curl prints text instead of compressed bytes.
const TRANSPORT_HEADER = /^(?::|content-length$|accept-encoding$)/i;
// fetch() refuses these.
const FETCH_FORBIDDEN_HEADER =
  /^(?:cookie|host|connection|origin|referer|user-agent|dnt|keep-alive|te|trailer|transfer-encoding|upgrade|via|date|expect|sec-.*|proxy-.*|access-control-request-.*)$/i;
const BODILESS_METHOD = /^(?:GET|HEAD)$/i;

export function toCurl(request: CapturedRequest, options: ShareOptions): string {
  const parts = [`curl ${quoteShell(getUrl(request, options))}`];
  if (request.method.toUpperCase() !== 'GET') parts.push(`-X ${request.method}`);
  for (const { name, value } of getHeaders(request, options)) {
    parts.push(`-H ${quoteShell(`${name}: ${value}`)}`);
  }
  const body = getBody(request, options);
  if (body !== '') parts.push(`--data-raw ${quoteShell(body)}`);
  return parts.join(' \\\n  ');
}

export function toFetch(request: CapturedRequest, options: ShareOptions): string {
  const headers: Record<string, string> = {};
  for (const { name, value } of getHeaders(request, options)) {
    if (FETCH_FORBIDDEN_HEADER.test(name)) continue;
    headers[name] = name in headers ? `${headers[name]}, ${value}` : value;
  }
  const init: Record<string, unknown> = { method: request.method, headers };
  const body = getBody(request, options);
  if (body !== '' && !BODILESS_METHOD.test(request.method)) init.body = body;
  // Scripts cannot set `cookie`; the browser attaches the cookies itself.
  if (request.requestHeaders.some(({ name }) => name.toLowerCase() === 'cookie')) {
    init.credentials = 'include';
  }
  return `await fetch(${JSON.stringify(getUrl(request, options))}, ${JSON.stringify(init, null, 2)});`;
}

/** Markdown, for pasting into an issue tracker. */
export function toBugReport(request: CapturedRequest, details: BugReportDetails): string {
  const { responseBody, graphqlErrors = [] } = details;
  const outcome = request.status === 0 ? 'failed (no response)' : `returned ${request.status}`;
  const facts: NameValue[] = [{ name: 'URL', value: getUrl(request, details) }];
  if (request.graphql) facts.push({ name: 'GraphQL', value: graphqlLabel(request.graphql) });
  if (request.duration !== null) {
    facts.push({ name: 'Duration', value: formatDuration(request.duration) });
  }
  if (request.startedAt > 0) {
    facts.push({ name: 'Time', value: new Date(request.startedAt).toISOString() });
  }
  facts.push(...request.responseHeaders.filter(({ name }) => TRACE_HEADER.test(name)));

  const sections = [
    `## ${request.method} ${getPath(request, details)} ${outcome}`,
    facts.map(({ name, value }) => `- **${name}:** ${value}`).join('\n'),
  ];
  if (graphqlErrors.length > 0) {
    sections.push('### GraphQL errors', graphqlErrors.map((message) => `- ${message}`).join('\n'));
  }
  const requestBody = getBody(request, details);
  if (requestBody !== '') sections.push('### Request body', fence(prettify(requestBody)));
  sections.push(
    '### Response',
    describeResponse(responseBody, details),
    '### Reproduce',
    fence(toCurl(request, details), 'bash'),
  );
  return `${sections.join('\n\n')}\n`;
}

function describeResponse(body: string | null, { hideSecrets }: ShareOptions): string {
  if (body === null) return '_The response body is not available._';
  if (body.trim() === '') return '_Empty._';
  return fence(prettify(hideSecrets ? hideJsonSecrets(body) : body));
}

function getHeaders(request: CapturedRequest, { hideSecrets }: ShareOptions): NameValue[] {
  return request.requestHeaders
    .filter(({ name }) => !TRANSPORT_HEADER.test(name))
    .map(({ name, value }) => ({
      name,
      value: hideSecrets && isSensitiveName(name) ? HIDDEN : value,
    }));
}

function getUrl({ url }: CapturedRequest, { hideSecrets }: ShareOptions): string {
  const queryStart = url.indexOf('?');
  if (!hideSecrets || queryStart === -1) return url;
  const hashStart = url.indexOf('#', queryStart);
  const queryEnd = hashStart === -1 ? url.length : hashStart;
  const query = url
    .slice(queryStart + 1, queryEnd)
    .split('&')
    .map(hideQuerySecret)
    .join('&');
  return `${url.slice(0, queryStart)}?${query}${url.slice(queryEnd)}`;
}

function hideQuerySecret(pair: string): string {
  const separator = pair.indexOf('=');
  if (separator === -1) return pair;
  const name = pair.slice(0, separator);
  return isSensitiveName(safeDecode(name)) ? `${name}=${HIDDEN}` : pair;
}

function getPath(request: CapturedRequest, options: ShareOptions): string {
  const url = getUrl(request, options);
  return URL.canParse(request.url) ? url.slice(new URL(request.url).origin.length) : url;
}

function getBody({ payload }: CapturedRequest, { hideSecrets }: ShareOptions): string {
  if (!payload) return '';
  if (payload.text === '') return encodeForm(payload.params, hideSecrets);
  if (!hideSecrets) return payload.text;
  return isUrlEncoded(payload.mimeType)
    ? encodeForm(payload.params, hideSecrets)
    : hideJsonSecrets(payload.text);
}

function encodeForm(params: readonly NameValue[], hideSecrets: boolean): string {
  return params
    .map(({ name, value }) => {
      const shown = hideSecrets && isSensitiveName(name) ? HIDDEN : encodeURIComponent(value);
      return `${encodeURIComponent(name)}=${shown}`;
    })
    .join('&');
}

function isUrlEncoded(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('application/x-www-form-urlencoded');
}

/** Only string values are hidden, so flags such as `authenticated: true` stay readable. */
function hideJsonSecrets(text: string): string {
  const parsed = parseJson(text);
  if (!parsed.ok) return text;
  let changed = false;
  const hide = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(hide);
    if (!isJsonObject(value)) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (typeof item !== 'string' || !isSensitiveName(key)) return [key, hide(item)];
        changed = true;
        return [key, HIDDEN];
      }),
    );
  };
  const hidden = hide(parsed.value);
  return changed ? stringifyJson(hidden, 0) : text;
}

function prettify(text: string): string {
  const parsed = parseJson(text);
  const pretty = parsed.ok ? stringifyJson(parsed.value) : text.trim();
  if (pretty.length <= MAX_REPORT_BODY_CHARS) return pretty;
  const rest = (pretty.length - MAX_REPORT_BODY_CHARS).toLocaleString('en-US');
  return `${pretty.slice(0, MAX_REPORT_BODY_CHARS)}\n… (${rest} more characters)`;
}

function fence(text: string, language = looksLikeJson(text) ? 'json' : ''): string {
  const longestRun = Math.max(0, ...Array.from(text.matchAll(/`+/g), ([run]) => run.length));
  const marks = '`'.repeat(Math.max(3, longestRun + 1));
  return `${marks}${language}\n${text}\n${marks}`;
}

function looksLikeJson(text: string): boolean {
  return /^\s*[[{]/.test(text);
}

function quoteShell(text: string): string {
  return `'${text.replaceAll("'", String.raw`'\''`)}'`;
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
