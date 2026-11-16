import { describe, expect, it } from 'vitest';
import {
  getFileSizeError,
  getSourceExportPath,
  PASTED_NAME,
  readSource,
} from '../src/viewer/source';

describe('readSource', () => {
  it('parses the text and keeps its name and size', () => {
    const text = '{"items":[{"id":12345678901234567890}]}';
    expect(readSource('users.json', text)).toEqual({
      ok: true,
      source: {
        name: 'users.json',
        size: text.length,
        data: { items: [{ id: 12345678901234567890n }] },
        precisionLoss: false,
      },
    });
  });

  it('explains what is wrong without calling it a response', () => {
    expect(readSource('a.json', '{"a":')).toMatchObject({
      ok: false,
      message: expect.stringMatching(/^The content is not valid JSON/) as unknown,
    });
    expect(readSource(PASTED_NAME, '  ')).toEqual({ ok: false, message: 'The content is empty.' });
  });
});

describe('getFileSizeError', () => {
  it('rejects files beyond the size limit before they are read', () => {
    expect(getFileSizeError(1024)).toBeNull();
    expect(getFileSizeError(64 * 1024 * 1024)).toMatch(/^The content is too large to inspect/);
  });
});

describe('getSourceExportPath', () => {
  it('drops the extension and names pasted content', () => {
    expect(getSourceExportPath('users.v2.json')).toBe('users.v2');
    expect(getSourceExportPath('README')).toBe('README');
    expect(getSourceExportPath(PASTED_NAME)).toBe('pasted');
  });
});
