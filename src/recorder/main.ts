import {
  addEntry,
  describeBody,
  fitsBodyLimit,
  getQueryString,
  isJsonType,
  isReadableBodyType,
  MAX_RECORDED_BODY,
  parseHeaderBlock,
  RECORDER_KEY,
  toHeaderList,
  type RecordedEntry,
  type RecordedHeader,
  type RecordedPostData,
  type RecorderBuffer,
} from './record';

// Injected into the page itself (not an isolated world) so it sees the page's own fetch and XHR
// calls. Every hook hands the page its original result and swallows its own errors.

interface PendingRequest {
  method: string;
  url: string;
  headers: RecordedHeader[];
  postData?: RecordedPostData;
  startedAt: number;
  startTime: number;
}

const key = Symbol.for(RECORDER_KEY);

if (!Reflect.has(window, key)) {
  const buffer: RecorderBuffer = { entries: [] };
  Object.defineProperty(window, key, { value: buffer });
  hookFetch(buffer);
  hookXhr(buffer);
}

function hookFetch(buffer: RecorderBuffer): void {
  const originalFetch = window.fetch;
  window.fetch = function fetch(input: RequestInfo | URL, init?: RequestInit) {
    let pending: PendingRequest | null = null;
    let requestBody: Promise<string | null> = Promise.resolve(null);
    try {
      const source = input instanceof Request ? input : null;
      const headers = new Headers(init?.headers ?? source?.headers);
      const contentType = headers.get('content-type') ?? '';
      pending = start(
        init?.method ?? source?.method ?? 'GET',
        source ? source.url : String(input),
        toHeaderList(headers),
      );
      if (init?.body != null) {
        pending.postData = describeBody(init.body, contentType);
      } else if (source?.body && isReadableBodyType(contentType)) {
        // Cloned before the real fetch, which uses the body up.
        requestBody = source
          .clone()
          .text()
          .catch(() => null);
      }
    } catch {
      pending = null;
    }

    const result = Reflect.apply(originalFetch, this, [input, init]) as Promise<Response>;
    if (pending) {
      const request = pending;
      result.then(
        (response) => recordResponse(buffer, request, response, requestBody),
        () => finish(buffer, request, 0, [], null),
      );
    }
    return result;
  };
}

function recordResponse(
  buffer: RecorderBuffer,
  request: PendingRequest,
  response: Response,
  requestBody: Promise<string | null>,
): void {
  try {
    if (response.type === 'opaque' || response.type === 'opaqueredirect') return;
    const contentType = response.headers.get('content-type') ?? '';
    const headers = toHeaderList(response.headers);
    // Cloned right away, before the page can start reading the body.
    const body =
      isJsonType(contentType) && fitsBodyLimit(response.headers.get('content-length'))
        ? response
            .clone()
            .text()
            .catch(() => null)
        : Promise.resolve(null);
    void Promise.all([body, requestBody]).then(([text, sent]) => {
      if (sent !== null && !request.postData) {
        request.postData = describeBody(sent, getHeader(request.headers, 'content-type'));
      }
      finish(buffer, request, response.status, headers, text, contentType);
    });
  } catch {
    // Never let recording break the page.
  }
}

function hookXhr(buffer: RecorderBuffer): void {
  const proto = XMLHttpRequest.prototype;
  const pending = new WeakMap<XMLHttpRequest, PendingRequest>();
  const { open, setRequestHeader, send } = proto;

  proto.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    try {
      pending.set(this, start(String(args[0]), String(args[1]), []));
    } catch {
      pending.delete(this);
    }
    return Reflect.apply(open, this, args) as void;
  } as typeof proto.open;

  proto.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
    pending.get(this)?.headers.push({ name, value });
    Reflect.apply(setRequestHeader, this, [name, value]);
  };

  proto.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const request = pending.get(this);
    if (request) {
      try {
        request.startedAt = Date.now();
        request.startTime = performance.now();
        request.postData = describeBody(body, getHeader(request.headers, 'content-type'));
        this.addEventListener('loadend', () => recordXhr(buffer, this, request), { once: true });
      } catch {
        // Never let recording break the page.
      }
    }
    Reflect.apply(send, this, [body]);
  };
}

function recordXhr(buffer: RecorderBuffer, xhr: XMLHttpRequest, request: PendingRequest): void {
  try {
    const contentType = xhr.getResponseHeader('content-type') ?? '';
    let text: string | null = null;
    if (isJsonType(contentType)) {
      if (xhr.responseType === '' || xhr.responseType === 'text') text = xhr.responseText;
      else if (xhr.responseType === 'json' && xhr.response !== null) {
        text = JSON.stringify(xhr.response);
      }
    }
    finish(
      buffer,
      request,
      xhr.status,
      parseHeaderBlock(xhr.getAllResponseHeaders()),
      text,
      contentType,
    );
  } catch {
    // Never let recording break the page.
  }
}

function start(method: string, url: string, headers: RecordedHeader[]): PendingRequest {
  return {
    method: method.toUpperCase(),
    url: new URL(url, location.href).href,
    headers,
    startedAt: Date.now(),
    startTime: performance.now(),
  };
}

function finish(
  buffer: RecorderBuffer,
  request: PendingRequest,
  status: number,
  headers: RecordedHeader[],
  body: string | null,
  contentType = '',
): void {
  const kept = body !== null && body.length <= MAX_RECORDED_BODY ? body : null;
  const entry: RecordedEntry = {
    startedDateTime: new Date(request.startedAt).toISOString(),
    time: Math.round(performance.now() - request.startTime),
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      queryString: getQueryString(request.url),
      ...(request.postData && { postData: request.postData }),
    },
    response: {
      status,
      headers,
      content: { mimeType: contentType, size: body?.length ?? 0 },
    },
    body: kept,
  };
  addEntry(buffer, entry);
}

function getHeader(headers: readonly RecordedHeader[], name: string): string {
  return headers.find((header) => header.name.toLowerCase() === name)?.value ?? '';
}
