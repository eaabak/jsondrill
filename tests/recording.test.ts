import { describe, expect, it } from 'vitest';
import {
  getPatternSite,
  getRecordingPattern,
  syncRecorder,
  type RecorderApis,
} from '../src/recording';

function createApis(granted: string[], registered: string[] | null) {
  const calls: string[] = [];
  const apis: RecorderApis = {
    getGrantedOrigins: async () => granted,
    getRegisteredMatches: async () => registered,
    register: async (matches) => {
      calls.push(`register ${matches.join(' ')}`);
    },
    unregister: async () => {
      calls.push('unregister');
    },
  };
  return { apis, calls };
}

describe('syncRecorder', () => {
  it('registers the recorder for the sites the user allowed', async () => {
    const { apis, calls } = createApis(['https://b.test/*', 'https://a.test/*'], null);
    await syncRecorder(apis);
    expect(calls).toEqual(['register https://a.test/* https://b.test/*']);
  });

  it('re-registers when the allowed sites change', async () => {
    const { apis, calls } = createApis(['https://a.test/*'], ['https://b.test/*']);
    await syncRecorder(apis);
    expect(calls).toEqual(['unregister', 'register https://a.test/*']);
  });

  it('removes the recorder when no site is allowed any more', async () => {
    const { apis, calls } = createApis([], ['https://a.test/*']);
    await syncRecorder(apis);
    expect(calls).toEqual(['unregister']);
  });

  it('leaves an up-to-date registration alone', async () => {
    const { apis, calls } = createApis(
      ['https://a.test/*', 'https://b.test/*'],
      ['https://b.test/*', 'https://a.test/*'],
    );
    await syncRecorder(apis);
    expect(calls).toEqual([]);
  });
});

describe('getRecordingPattern', () => {
  it('covers the whole host of web pages, on every port', () => {
    expect(getRecordingPattern('https://app.example.com/orders?id=1')).toBe(
      'https://app.example.com/*',
    );
    expect(getRecordingPattern('http://localhost:5173/')).toBe('http://localhost/*');
  });

  it('rejects pages that cannot be recorded', () => {
    expect(getRecordingPattern('chrome://extensions/')).toBeNull();
    expect(getRecordingPattern('file:///tmp/data.json')).toBeNull();
    expect(getRecordingPattern('')).toBeNull();
  });

  it('names the site of a pattern', () => {
    expect(getPatternSite('https://app.example.com/*')).toBe('app.example.com');
  });
});
