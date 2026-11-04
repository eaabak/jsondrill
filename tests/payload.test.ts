import { describe, expect, it } from 'vitest';
import { readPayload } from '../src/network/payload';
import type { RequestPayload } from '../src/network/requests';

function payload(mimeType: string, text: string, params: RequestPayload['params'] = []) {
  return { mimeType, text, params };
}

describe('readPayload', () => {
  it('parses JSON bodies, including GraphQL batches', () => {
    expect(readPayload(payload('application/json', '{"query":"{ me { id } }"}'))).toEqual({
      kind: 'json',
      data: { query: '{ me { id } }' },
      precisionLoss: false,
    });
    expect(readPayload(payload('application/json', '[{"id":1},{"id":2}]'))).toMatchObject({
      kind: 'json',
      data: [{ id: 1 }, { id: 2 }],
    });
  });

  it('keeps large integer IDs exact', () => {
    const content = readPayload(payload('application/json', '{"id":12345678901234567890}'));
    expect(content).toMatchObject({ kind: 'json', data: { id: 12345678901234567890n } });
  });

  it('recognises JSON sent with a text content type', () => {
    expect(readPayload(payload('text/plain;charset=UTF-8', ' {"event":"click"}'))).toMatchObject({
      kind: 'json',
      data: { event: 'click' },
    });
  });

  it('shows invalid JSON as text with a note', () => {
    expect(readPayload(payload('application/json', '{"broken":'))).toEqual({
      kind: 'text',
      text: '{"broken":',
      note: 'The payload is not valid JSON, so it is shown as text.',
    });
  });

  it('shows form fields as a table', () => {
    const params = [{ name: 'q', value: 'shoes' }];
    expect(readPayload(payload('application/x-www-form-urlencoded', 'q=shoes', params))).toEqual({
      kind: 'form',
      params,
    });
  });

  it('falls back to plain text', () => {
    expect(readPayload(payload('text/plain', 'hello'))).toEqual({ kind: 'text', text: 'hello' });
    expect(readPayload(payload('text/plain', '[not json'))).toEqual({
      kind: 'text',
      text: '[not json',
    });
  });
});
