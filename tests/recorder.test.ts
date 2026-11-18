import { describe, expect, it } from 'vitest';
import {
  addEntry,
  describeBody,
  fitsBodyLimit,
  isJsonType,
  isReadableBodyType,
  MAX_RECORDED_BODY,
  MAX_RECORDED_ENTRIES,
  parseHeaderBlock,
  type RecordedEntry,
  type RecorderBuffer,
} from '../src/recorder/record';

const entry = (body: string | null): RecordedEntry => ({
  startedDateTime: '2026-11-17T10:00:00.000Z',
  time: 1,
  request: { method: 'GET', url: 'https://x.test/', headers: [], queryString: [] },
  response: { status: 200, headers: [], content: { mimeType: '', size: 0 } },
  body,
});

describe('recorder helpers', () => {
  it('keeps bodies of JSON responses only', () => {
    expect(isJsonType('application/json; charset=utf-8')).toBe(true);
    expect(isJsonType('application/problem+json')).toBe(true);
    expect(isJsonType('text/event-stream')).toBe(false);
    expect(isJsonType('')).toBe(false);
  });

  it('reads text request bodies and skips uploads', () => {
    expect(isReadableBodyType('application/json')).toBe(true);
    expect(isReadableBodyType('application/x-www-form-urlencoded')).toBe(true);
    expect(isReadableBodyType('image/png')).toBe(false);
  });

  it('skips responses announced as too large', () => {
    expect(fitsBodyLimit(null)).toBe(true);
    expect(fitsBodyLimit('1024')).toBe(true);
    expect(fitsBodyLimit(String(MAX_RECORDED_BODY + 1))).toBe(false);
  });

  it('parses XHR response headers', () => {
    expect(parseHeaderBlock('content-type: application/json\r\nx-id: a:b\r\n\r\n')).toEqual([
      { name: 'content-type', value: 'application/json' },
      { name: 'x-id', value: 'a:b' },
    ]);
  });

  it('describes string, form and multipart bodies', () => {
    expect(describeBody('{"a":1}', 'application/json')).toEqual({
      mimeType: 'application/json',
      text: '{"a":1}',
    });
    expect(describeBody(new URLSearchParams({ q: 'x y' }), '')).toEqual({
      mimeType: 'application/x-www-form-urlencoded',
      text: 'q=x+y',
    });
    const form = new FormData();
    form.append('name', 'Ada');
    form.append('file', new File(['x'], 'cv.pdf'));
    expect(describeBody(form, '')?.params).toEqual([
      { name: 'name', value: 'Ada' },
      { name: 'file', fileName: 'cv.pdf' },
    ]);
    expect(describeBody(new Blob(['x']), '')).toBeUndefined();
  });

  it('keeps the newest entries within its limits', () => {
    const buffer: RecorderBuffer = { entries: [] };
    for (let index = 0; index < MAX_RECORDED_ENTRIES + 5; index += 1) {
      addEntry(buffer, entry(String(index)));
    }
    expect(buffer.entries).toHaveLength(MAX_RECORDED_ENTRIES);
    expect(buffer.entries[0]?.body).toBe('5');
  });

  it('drops old bodies once the text budget is used up', () => {
    const buffer: RecorderBuffer = { entries: [] };
    const big = 'x'.repeat(MAX_RECORDED_BODY);
    for (let index = 0; index < 6; index += 1) addEntry(buffer, entry(big));
    expect(buffer.entries).toHaveLength(4);
  });
});
