// Runs inside web pages, so this file must not import anything the panel also imports: a shared
// chunk would turn the recorder into an ES module, which Chrome cannot inject as a content script.

export interface RecordedHeader {
  name: string;
  value: string;
}

export interface RecordedPostData {
  mimeType: string;
  text?: string;
  params?: { name: string; value?: string; fileName?: string }[];
}

/** Shaped like a HAR entry so the panel can read it with the same code as the Network log. */
export interface RecordedEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    headers: RecordedHeader[];
    queryString: RecordedHeader[];
    postData?: RecordedPostData;
  };
  response: {
    status: number;
    headers: RecordedHeader[];
    content: { mimeType: string; size: number };
  };
  body: string | null;
}

export interface RecorderBuffer {
  entries: RecordedEntry[];
}

/** Also read by the panel through `Symbol.for`; tests keep both copies equal. */
export const RECORDER_KEY = 'jsondrill.recorder';
export const MAX_RECORDED_ENTRIES = 300;
export const MAX_RECORDED_BODY = 5_000_000;
const MAX_BUFFERED_TEXT = 20_000_000;

const JSON_MIME_TYPE = /^[a-z0-9.+-]+\/(?:[a-z0-9.-]+\+)?json$/;
const READABLE_BODY = /json|text|x-www-form-urlencoded|graphql/i;

export function isJsonType(contentType: string): boolean {
  return JSON_MIME_TYPE.test(contentType.split(';')[0]?.trim().toLowerCase() ?? '');
}

/** Request bodies worth reading as text; uploads and binary data are skipped. */
export function isReadableBodyType(contentType: string): boolean {
  return READABLE_BODY.test(contentType);
}

/** Whether a response announced as `contentLength` bytes is small enough to keep. */
export function fitsBodyLimit(contentLength: string | null): boolean {
  if (contentLength === null) return true;
  const length = Number(contentLength);
  return !Number.isFinite(length) || length <= MAX_RECORDED_BODY;
}

export function toHeaderList(headers: Iterable<[string, string]>): RecordedHeader[] {
  return Array.from(headers, ([name, value]) => ({ name, value }));
}

/** Parses the block returned by `XMLHttpRequest.getAllResponseHeaders()`. */
export function parseHeaderBlock(block: string): RecordedHeader[] {
  return block.split(/\r?\n/).flatMap((line) => {
    const colon = line.indexOf(':');
    if (colon <= 0) return [];
    return [{ name: line.slice(0, colon).trim(), value: line.slice(colon + 1).trim() }];
  });
}

export function getQueryString(url: string): RecordedHeader[] {
  try {
    return toHeaderList(new URL(url).searchParams);
  } catch {
    return [];
  }
}

export function describeBody(body: unknown, contentType: string): RecordedPostData | undefined {
  if (typeof body === 'string') {
    return { mimeType: contentType || 'text/plain', text: body.slice(0, MAX_RECORDED_BODY) };
  }
  if (body instanceof URLSearchParams) {
    return {
      mimeType: contentType || 'application/x-www-form-urlencoded',
      text: body.toString(),
    };
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const params = Array.from(body, ([name, value]) =>
      typeof value === 'string' ? { name, value } : { name, fileName: value.name },
    );
    return { mimeType: contentType || 'multipart/form-data', params };
  }
  return undefined;
}

/** Keeps the newest entries within a count and a text budget, so a busy page cannot grow it. */
export function addEntry(buffer: RecorderBuffer, entry: RecordedEntry): void {
  buffer.entries.push(entry);
  let total = buffer.entries.reduce((sum, { body }) => sum + (body?.length ?? 0), 0);
  while (
    buffer.entries.length > MAX_RECORDED_ENTRIES ||
    (total > MAX_BUFFERED_TEXT && buffer.entries.length > 1)
  ) {
    total -= buffer.entries.shift()?.body?.length ?? 0;
  }
}
