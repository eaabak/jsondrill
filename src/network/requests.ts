export interface NameValue {
  name: string;
  value: string;
}

export interface FormParam extends NameValue {
  fileName?: string;
}

export interface RequestPayload {
  mimeType: string;
  text: string;
  params: readonly FormParam[];
}

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
  requestHeaders: readonly NameValue[];
  responseHeaders: readonly NameValue[];
  queryParams: readonly NameValue[];
  payload: RequestPayload | null;
  readBody: () => Promise<string>;
}

/** The subset of a HAR entry JSONDrill relies on. */
export interface HarEntryLike {
  startedDateTime: string;
  request: {
    method: string;
    url: string;
    headers?: readonly NameValue[];
    queryString?: readonly NameValue[];
    postData?: HarPostData;
  };
  response: {
    status: number;
    headers?: readonly NameValue[];
    content: { mimeType?: string; size: number };
  };
}

interface HarPostData {
  mimeType?: string;
  text?: string;
  params?: readonly { name: string; value?: string; fileName?: string }[];
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
const FORM_URLENCODED = 'application/x-www-form-urlencoded';
// `auth(?!or)` keeps "author" visible.
const SENSITIVE_NAME =
  /authoriz|auth(?!or)|cookie|token|secret|passw|api[-_]?key|session|credential|signature|jwt/i;

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
    requestHeaders: toNameValues(entry.request.headers).toSorted(compareNames),
    responseHeaders: toNameValues(entry.response.headers).toSorted(compareNames),
    queryParams: toNameValues(entry.request.queryString),
    payload: createPayload(entry.request.postData),
    readBody,
  };
}

export function isSameEndpoint(a: CapturedRequest, b: CapturedRequest): boolean {
  return a.method === b.method && getEndpointUrl(a.url) === getEndpointUrl(b.url);
}

export function isSensitiveName(name: string): boolean {
  return SENSITIVE_NAME.test(name);
}

/** Status 0 means the request never received a response (blocked, aborted or failed). */
export function isFailedStatus(status: number): boolean {
  return status === 0 || status >= FIRST_ERROR_STATUS;
}

export function isJsonMimeType(mimeType: string): boolean {
  return JSON_MIME_TYPE.test(getMimeEssence(mimeType));
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

function getEndpointUrl(url: string): string {
  if (!URL.canParse(url)) return url;
  const { origin, pathname } = new URL(url);
  return `${origin}${pathname}`;
}

function getDisplayPath(url: string): string {
  if (!URL.canParse(url)) return url;
  const { pathname, search } = new URL(url);
  return `${pathname}${search}`;
}

function getMimeEssence(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
}

function compareNames(a: NameValue, b: NameValue): number {
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
}

function toNameValues(list: readonly NameValue[] | undefined): NameValue[] {
  return list?.map(({ name, value }) => ({ name, value })) ?? [];
}

function createPayload(postData: HarPostData | undefined): RequestPayload | null {
  if (!postData) return null;
  const mimeType = postData.mimeType ?? '';
  const text = postData.text ?? '';
  const params =
    postData.params && postData.params.length > 0
      ? postData.params.map(toFormParam)
      : parseUrlEncoded(mimeType, text);
  if (text === '' && params.length === 0) return null;
  return { mimeType, text, params };
}

function toFormParam({ name, value, fileName }: NonNullable<HarPostData['params']>[number]) {
  const param: FormParam = { name, value: value ?? '' };
  if (fileName !== undefined) param.fileName = fileName;
  return param;
}

function parseUrlEncoded(mimeType: string, text: string): FormParam[] {
  if (getMimeEssence(mimeType) !== FORM_URLENCODED || text === '') return [];
  return Array.from(new URLSearchParams(text), ([name, value]) => ({ name, value }));
}
