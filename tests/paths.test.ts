import { describe, expect, it } from 'vitest';
import { EACH, formatPath, resolvePath } from '../src/core';

describe('formatPath', () => {
  it('formats nested keys and array steps', () => {
    expect(formatPath(['profile', 'city'])).toBe('profile.city');
    expect(formatPath(['orders', EACH, 'status'])).toBe('orders[].status');
    expect(formatPath([EACH])).toBe('[]');
  });

  it('quotes keys that would otherwise be ambiguous', () => {
    expect(formatPath(['a.b'])).toBe('["a.b"]');
    expect(formatPath(['meta', 'first name'])).toBe('meta["first name"]');
    expect(formatPath(['[]'])).not.toBe(formatPath([EACH]));
  });
});

describe('resolvePath', () => {
  it('distinguishes null from missing', () => {
    expect(resolvePath({ a: null }, ['a'])).toEqual({ values: [null], missing: false });
    expect(resolvePath({}, ['a'])).toEqual({ values: [], missing: true });
    expect(resolvePath({ a: null }, ['a', 'b'])).toEqual({ values: [], missing: true });
  });

  it('collects values across array elements and reports gaps', () => {
    const record = { orders: [{ status: 'paid' }, {}, { status: 'open' }] };
    expect(resolvePath(record, ['orders', EACH, 'status'])).toEqual({
      values: ['paid', 'open'],
      missing: true,
    });
  });

  it('ignores inherited properties', () => {
    expect(resolvePath({}, ['constructor']).missing).toBe(true);
  });
});
