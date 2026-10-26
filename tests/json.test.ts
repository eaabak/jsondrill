import { describe, expect, it } from 'vitest';
import { parseJson, stringifyJson } from '../src/core';

function parseOk(text: string): unknown {
  const result = parseJson(text);
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe('parseJson', () => {
  it('parses valid JSON', () => {
    expect(parseJson('{"a":[1,2],"b":null}')).toEqual({
      ok: true,
      value: { a: [1, 2], b: null },
      precisionLoss: false,
    });
  });

  it('keeps integers beyond the safe range exact as bigint', () => {
    expect(parseOk('{"id":12345678901234567890,"small":42,"ratio":0.12345678901234567}')).toEqual({
      id: 12345678901234567890n,
      small: 42,
      ratio: Number('0.12345678901234567'),
    });
  });

  it('does not echo response content in syntax errors', () => {
    const result = parseJson('{"token":"secret-value",}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/not valid JSON/);
    expect(result.message).not.toContain('secret');
  });

  it('rejects empty and oversized bodies', () => {
    expect(parseJson('   ')).toMatchObject({ ok: false, message: 'Response body is empty.' });
    expect(parseJson('[1,2,3]', 3)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/too large/),
    });
  });
});

describe('stringifyJson', () => {
  it('serialises bigint values as exact JSON numbers', () => {
    const text = '{"id":12345678901234567890,"name":"x"}';
    expect(stringifyJson(parseOk(text), 0)).toBe(text);
  });
});
