import {
  createCapturedRequest,
  type CapturedRequest,
  type HarEntryLike,
  type NameValue,
} from './requests';

/** Same key as the recorder's; a test keeps the two equal. */
export const RECORDER_KEY = 'jsondrill.recorder';

/** Reads the recorder's buffer in the inspected page; evaluates to null when nothing recorded. */
export const READ_RECORDED_EXPRESSION = `(window[Symbol.for(${JSON.stringify(RECORDER_KEY)})]?.entries ?? null)`;

/** A request the page sent while DevTools was closed is matched to the same one in the log. */
const SAME_REQUEST_WINDOW_MS = 2000;

const BODY_NOT_RECORDED =
  'JSONDrill recorded this request while DevTools was closed but kept no response body, because it was not JSON or was larger than 5 MB.';

/**
 * Turns what the recorder kept into requests. The buffer lives in the page, so anything that
 * does not look like a recorded entry is skipped.
 */
export function parseRecordedEntries(value: unknown): CapturedRequest[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    const entry = toHarEntry(item);
    if (!entry) return [];
    const body = getString(item, 'body');
    const readBody = () =>
      body === null ? Promise.reject(new Error(BODY_NOT_RECORDED)) : Promise.resolve(body);
    const request = createCapturedRequest(entry, readBody);
    return [{ ...request, id: `recorded ${request.id}`, recordedInPage: true }];
  });
}

/**
 * Leaves out recorded requests that the Network log also has, which happens for requests sent
 * after DevTools opened. Each logged request cancels out at most one recorded one.
 */
export function dropLoggedRequests(
  recorded: readonly CapturedRequest[],
  logged: readonly CapturedRequest[],
): CapturedRequest[] {
  const unmatched = [...logged];
  return recorded.filter((request) => {
    const index = unmatched.findIndex(
      (candidate) =>
        candidate.method === request.method &&
        candidate.url === request.url &&
        Math.abs(candidate.startedAt - request.startedAt) <= SAME_REQUEST_WINDOW_MS,
    );
    if (index === -1) return true;
    unmatched.splice(index, 1);
    return false;
  });
}

function toHarEntry(item: unknown): HarEntryLike | null {
  const request = getObject(item, 'request');
  const response = getObject(item, 'response');
  const content = getObject(response, 'content');
  const startedDateTime = getString(item, 'startedDateTime');
  const method = getString(request, 'method');
  const url = getString(request, 'url');
  const status = getNumber(response, 'status');
  if (startedDateTime === null || method === null || url === null || status === null) return null;

  const postData = getObject(request, 'postData');
  const params = getList(postData, 'params').flatMap((param) => {
    const name = getString(param, 'name');
    if (name === null) return [];
    const value = getString(param, 'value');
    const fileName = getString(param, 'fileName');
    return [{ name, ...(value !== null && { value }), ...(fileName !== null && { fileName }) }];
  });
  return {
    startedDateTime,
    time: getNumber(item, 'time') ?? undefined,
    request: {
      method,
      url,
      headers: getNameValues(request, 'headers'),
      queryString: getNameValues(request, 'queryString'),
      postData: postData
        ? {
            mimeType: getString(postData, 'mimeType') ?? '',
            text: getString(postData, 'text') ?? undefined,
            params,
          }
        : undefined,
    },
    response: {
      status,
      headers: getNameValues(response, 'headers'),
      content: {
        mimeType: getString(content, 'mimeType') ?? '',
        size: getNumber(content, 'size') ?? 0,
      },
    },
  };
}

function getNameValues(source: unknown, key: string): NameValue[] {
  return getList(source, key).flatMap((item) => {
    const name = getString(item, 'name');
    const value = getString(item, 'value');
    return name === null || value === null ? [] : [{ name, value }];
  });
}

function getObject(source: unknown, key: string): object | null {
  const value: unknown = isObject(source) ? Reflect.get(source, key) : undefined;
  return isObject(value) ? value : null;
}

function getList(source: unknown, key: string): unknown[] {
  const value: unknown = isObject(source) ? Reflect.get(source, key) : undefined;
  return Array.isArray(value) ? value : [];
}

function getString(source: unknown, key: string): string | null {
  const value: unknown = isObject(source) ? Reflect.get(source, key) : undefined;
  return typeof value === 'string' ? value : null;
}

function getNumber(source: unknown, key: string): number | null {
  const value: unknown = isObject(source) ? Reflect.get(source, key) : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}
