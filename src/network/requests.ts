export interface CapturedRequest {
  id: string;
  method: string;
  url: string;
  path: string;
  status: number;
  mimeType: string;
  size: number;
  startedAt: number;
  isJson: boolean;
  readBody: () => Promise<string>;
}

/** The subset of a HAR entry JSONDrill relies on. */
export interface HarEntryLike {
  startedDateTime: string;
  request: { method: string; url: string };
  response: { status: number; content: { mimeType?: string; size: number } };
}

export interface NetworkSource {
  getRequests(): Promise<CapturedRequest[]>;
  onRequest(listener: (request: CapturedRequest) => void): () => void;
  onNavigated(listener: () => void): () => void;
  reloadPage(): void;
}

export interface RequestFilter {
  text: string;
  jsonOnly: boolean;
}

export const MAX_CAPTURED_REQUESTS = 500;
const FIRST_ERROR_STATUS = 400;

const JSON_MIME_TYPE = /^[a-z0-9.+-]+\/(?:[a-z0-9.-]+\+)?json$/;

export function createCapturedRequest(
  entry: HarEntryLike,
  readBody: () => Promise<string>,
): CapturedRequest {
  const { method, url } = entry.request;
  const { status, content } = entry.response;
  const mimeType = content.mimeType ?? '';
  return {
    // HAR entries carry no stable identifier; start time plus method and URL identifies the
    // same request whether it arrives through getHAR() or onRequestFinished.
    id: `${entry.startedDateTime} ${method} ${url}`,
    method,
    url,
    path: getDisplayPath(url),
    status,
    mimeType,
    size: content.size,
    startedAt: Date.parse(entry.startedDateTime) || 0,
    isJson: isJsonMimeType(mimeType),
    readBody,
  };
}

/** Status 0 means the request never received a response (blocked, aborted or failed). */
export function isFailedStatus(status: number): boolean {
  return status === 0 || status >= FIRST_ERROR_STATUS;
}

export function isJsonMimeType(mimeType: string): boolean {
  const essence = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return JSON_MIME_TYPE.test(essence);
}

/** Merges requests newest first. Incoming requests replace existing ones with the same id. */
export function mergeRequests(
  current: readonly CapturedRequest[],
  incoming: readonly CapturedRequest[],
  limit = MAX_CAPTURED_REQUESTS,
): CapturedRequest[] {
  const byId = new Map(current.map((request) => [request.id, request]));
  for (const request of incoming) byId.set(request.id, request);
  return [...byId.values()].toSorted((a, b) => b.startedAt - a.startedAt).slice(0, limit);
}

export function filterRequests(
  requests: readonly CapturedRequest[],
  { text, jsonOnly }: RequestFilter,
): CapturedRequest[] {
  const needle = text.trim().toLowerCase();
  return requests.filter(
    (request) =>
      (!jsonOnly || request.isJson) &&
      (needle === '' ||
        `${request.method} ${request.status} ${request.url}`.toLowerCase().includes(needle)),
  );
}

function getDisplayPath(url: string): string {
  if (!URL.canParse(url)) return url;
  const { pathname, search } = new URL(url);
  return `${pathname}${search}`;
}
