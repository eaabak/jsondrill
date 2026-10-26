import { describe, expect, it } from 'vitest';
import {
  createCapturedRequest,
  filterRequests,
  isFailedStatus,
  isJsonMimeType,
  mergeRequests,
  type HarEntryLike,
} from '../src/network/requests';

const readBody = () => Promise.resolve('{}');

function capture(
  url: string,
  startedDateTime: string,
  options: { status?: number; mimeType?: string } = {},
) {
  const entry: HarEntryLike = {
    startedDateTime,
    request: { method: 'GET', url },
    response: {
      status: options.status ?? 200,
      content: { mimeType: options.mimeType ?? 'application/json', size: 10 },
    },
  };
  return createCapturedRequest(entry, readBody);
}

describe('createCapturedRequest', () => {
  it('derives display metadata from a HAR entry', () => {
    const request = capture('https://api.example.com/v1/users?page=2', '2026-01-01T10:00:00.000Z');
    expect(request).toMatchObject({
      method: 'GET',
      path: '/v1/users?page=2',
      status: 200,
      isJson: true,
      startedAt: Date.parse('2026-01-01T10:00:00.000Z'),
    });
  });
});

describe('isJsonMimeType', () => {
  it('accepts JSON media types and rejects others', () => {
    expect(isJsonMimeType('application/json; charset=utf-8')).toBe(true);
    expect(isJsonMimeType('application/vnd.api+json')).toBe(true);
    expect(isJsonMimeType('application/problem+json')).toBe(true);
    expect(isJsonMimeType('text/json')).toBe(true);
    expect(isJsonMimeType('application/x-ndjson')).toBe(false);
    expect(isJsonMimeType('text/html')).toBe(false);
    expect(isJsonMimeType('')).toBe(false);
  });
});

describe('mergeRequests', () => {
  const older = capture('https://x.test/a', '2026-01-01T10:00:00.000Z');
  const newer = capture('https://x.test/b', '2026-01-01T10:00:05.000Z');

  it('orders requests newest first', () => {
    expect(mergeRequests([older], [newer]).map((request) => request.path)).toEqual(['/b', '/a']);
  });

  it('deduplicates the same request and keeps the incoming copy', () => {
    const updated = capture('https://x.test/a', '2026-01-01T10:00:00.000Z', { status: 304 });
    const merged = mergeRequests([older, newer], [updated]);
    expect(merged).toHaveLength(2);
    expect(merged.find((request) => request.path === '/a')?.status).toBe(304);
  });

  it('drops the oldest requests beyond the retention limit', () => {
    const requests = Array.from({ length: 5 }, (_, index) =>
      capture(`https://x.test/${index}`, `2026-01-01T10:00:0${index}.000Z`),
    );
    expect(mergeRequests([], requests, 3).map((request) => request.path)).toEqual([
      '/4',
      '/3',
      '/2',
    ]);
  });
});

describe('filterRequests', () => {
  const requests = [
    capture('https://x.test/api/users', '2026-01-01T10:00:00.000Z'),
    capture('https://x.test/app.js', '2026-01-01T10:00:01.000Z', { mimeType: 'text/javascript' }),
    capture('https://x.test/api/orders', '2026-01-01T10:00:02.000Z', { status: 404 }),
  ];

  it('filters by content type and text', () => {
    expect(filterRequests(requests, { text: '', jsonOnly: true })).toHaveLength(2);
    expect(filterRequests(requests, { text: '', jsonOnly: false })).toHaveLength(3);
    expect(filterRequests(requests, { text: 'ORDERS', jsonOnly: true }).map((r) => r.path)).toEqual(
      ['/api/orders'],
    );
    expect(filterRequests(requests, { text: '404', jsonOnly: true })).toHaveLength(1);
  });
});

describe('isFailedStatus', () => {
  it('flags error and missing statuses', () => {
    expect(isFailedStatus(0)).toBe(true);
    expect(isFailedStatus(404)).toBe(true);
    expect(isFailedStatus(204)).toBe(false);
  });
});
