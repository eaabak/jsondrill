import { describe, expect, it } from 'vitest';
import {
  dropLoggedRequests,
  parseRecordedEntries,
  READ_RECORDED_EXPRESSION,
  RECORDER_KEY,
} from '../src/network/recorded';
import { createCapturedRequest } from '../src/network/requests';
import { RECORDER_KEY as RECORDER_SIDE_KEY, type RecordedEntry } from '../src/recorder/record';

const entry = (overrides: Partial<RecordedEntry> = {}): RecordedEntry => ({
  startedDateTime: '2026-11-17T10:00:00.000Z',
  time: 120,
  request: {
    method: 'POST',
    url: 'https://x.test/api/orders?page=2',
    headers: [{ name: 'Authorization', value: 'Bearer abc' }],
    queryString: [{ name: 'page', value: '2' }],
    postData: { mimeType: 'application/json', text: '{"id":1}' },
  },
  response: {
    status: 201,
    headers: [{ name: 'Content-Type', value: 'application/json' }],
    content: { mimeType: 'application/json', size: 11 },
  },
  body: '{"ok":true}',
  ...overrides,
});

describe('parseRecordedEntries', () => {
  it('reads what the recorder kept like a Network log entry', async () => {
    const [request] = parseRecordedEntries([entry()]);
    expect(request).toMatchObject({
      method: 'POST',
      path: '/api/orders?page=2',
      status: 201,
      duration: 120,
      isJson: true,
      recordedInPage: true,
      queryParams: [{ name: 'page', value: '2' }],
      payload: { text: '{"id":1}' },
    });
    expect(request?.id.startsWith('recorded ')).toBe(true);
    await expect(request?.readBody()).resolves.toBe('{"ok":true}');
  });

  it('explains a missing body', async () => {
    const [request] = parseRecordedEntries([entry({ body: null })]);
    await expect(request?.readBody()).rejects.toThrow('while DevTools was closed');
  });

  it('skips anything the page may have put there instead', () => {
    expect(parseRecordedEntries(null)).toEqual([]);
    expect(parseRecordedEntries('x')).toEqual([]);
    expect(parseRecordedEntries([{}, 42, { request: { method: 'GET' } }, entry()])).toHaveLength(1);
  });

  it('uses the same buffer key as the recorder', () => {
    expect(RECORDER_KEY).toBe(RECORDER_SIDE_KEY);
    expect(READ_RECORDED_EXPRESSION).toContain(JSON.stringify(RECORDER_KEY));
  });
});

const logged = (startedDateTime: string) =>
  createCapturedRequest(
    {
      startedDateTime,
      request: { method: 'POST', url: 'https://x.test/api/orders?page=2' },
      response: { status: 201, content: { size: 0 } },
    },
    async () => '',
  );

describe('dropLoggedRequests', () => {
  it('keeps only requests the Network log does not have', () => {
    const recorded = parseRecordedEntries([
      entry({ startedDateTime: '2026-11-17T09:00:00.000Z' }),
      entry({ startedDateTime: '2026-11-17T10:00:00.000Z' }),
    ]);
    const kept = dropLoggedRequests(recorded, [logged('2026-11-17T10:00:00.150Z')]);
    expect(kept.map((request) => request.startedAt)).toEqual([
      Date.parse('2026-11-17T09:00:00.000Z'),
    ]);
  });

  it('matches each logged request once', () => {
    const recorded = parseRecordedEntries([entry(), entry()]);
    expect(dropLoggedRequests(recorded, [logged('2026-11-17T10:00:00.010Z')])).toHaveLength(1);
  });
});
