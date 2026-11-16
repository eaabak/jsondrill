import { describe, expect, it } from 'vitest';
import { formatDuration } from '../src/core';
import {
  countRepeats,
  getRequestIssue,
  getRequestSpeed,
  sortRequests,
  summarizeEndpoint,
} from '../src/network/insights';
import {
  createCapturedRequest,
  filterRequests,
  isSameEndpoint,
  type GraphqlErrors,
  type HarEntryLike,
} from '../src/network/requests';

const readBody = () => Promise.resolve('{}');
const NO_ERRORS: GraphqlErrors = new Map();

interface Options {
  url?: string;
  method?: string;
  status?: number;
  time?: number;
  second?: number;
  ms?: number;
  body?: string;
  timings?: HarEntryLike['timings'];
}

function capture(options: Options = {}) {
  const second = String(options.second ?? 0).padStart(2, '0');
  const ms = String(options.ms ?? 0).padStart(3, '0');
  const entry: HarEntryLike = {
    startedDateTime: `2026-01-01T10:00:${second}.${ms}Z`,
    request: {
      method: options.method ?? 'GET',
      url: options.url ?? 'https://x.test/api/users',
      ...(options.body === undefined
        ? {}
        : { postData: { mimeType: 'application/json', text: options.body } }),
    },
    response: {
      status: options.status ?? 200,
      content: { mimeType: 'application/json', size: 10 },
    },
  };
  if (options.time !== undefined) entry.time = options.time;
  if (options.timings !== undefined) entry.timings = options.timings;
  return createCapturedRequest(entry, readBody);
}

const paths = (list: readonly { path: string }[]) => list.map((request) => request.path);

describe('request duration', () => {
  it('reads the total time and the phases from the HAR entry', () => {
    const request = capture({
      time: 250.4,
      timings: { blocked: 2, dns: -1, connect: -1, send: 0.5, wait: 200, receive: 47.9 },
    });
    expect(request.duration).toBe(250.4);
    expect(request.timings).toEqual({
      blocked: 2,
      dns: null,
      connect: null,
      send: 0.5,
      wait: 200,
      receive: 47.9,
    });
  });

  it('treats a missing or negative time as unknown', () => {
    expect(capture().duration).toBeNull();
    expect(capture().timings).toBeNull();
    expect(capture({ time: -1 }).duration).toBeNull();
  });

  it('formats durations compactly', () => {
    expect(formatDuration(0.4)).toBe('0 ms');
    expect(formatDuration(243.2)).toBe('243 ms');
    expect(formatDuration(999.7)).toBe('1 s');
    expect(formatDuration(2140)).toBe('2.1 s');
    expect(formatDuration(90_000)).toBe('1.5 min');
  });

  it('classifies slow and very slow requests', () => {
    expect(getRequestSpeed(null)).toBe('normal');
    expect(getRequestSpeed(999)).toBe('normal');
    expect(getRequestSpeed(1000)).toBe('slow');
    expect(getRequestSpeed(2999)).toBe('slow');
    expect(getRequestSpeed(3000)).toBe('very-slow');
  });
});

describe('getRequestIssue', () => {
  it('reports the most serious problem', () => {
    const graphql = capture({ time: 5000 });
    const errors: GraphqlErrors = new Map([[graphql.id, ['Boom']]]);
    expect(getRequestIssue(capture({ status: 0, time: 5000 }), NO_ERRORS)).toBe('failed');
    expect(getRequestIssue(capture({ status: 503 }), NO_ERRORS)).toBe('server-error');
    expect(getRequestIssue(capture({ status: 404 }), NO_ERRORS)).toBe('client-error');
    expect(getRequestIssue(graphql, errors)).toBe('graphql-error');
    expect(getRequestIssue(graphql, NO_ERRORS)).toBe('very-slow');
    expect(getRequestIssue(capture({ time: 1500 }), NO_ERRORS)).toBe('slow');
    expect(getRequestIssue(capture({ time: 20 }), NO_ERRORS)).toBe('none');
  });
});

describe('sortRequests', () => {
  const ok = capture({ url: 'https://x.test/ok', second: 0, time: 20 });
  const slow = capture({ url: 'https://x.test/slow', second: 1, time: 1200 });
  const notFound = capture({ url: 'https://x.test/404', second: 2, status: 404, time: 30 });
  const verySlow = capture({ url: 'https://x.test/very-slow', second: 3, time: 4000 });
  const failed = capture({ url: 'https://x.test/failed', second: 4, status: 0 });
  const gql = capture({ url: 'https://x.test/gql', second: 5, time: 40 });
  const serverError = capture({ url: 'https://x.test/500', second: 6, status: 500, time: 10 });
  const requests = [ok, slow, notFound, verySlow, failed, gql, serverError];
  const errors: GraphqlErrors = new Map([[gql.id, ['Boom']]]);

  it('keeps the time order by default', () => {
    expect(sortRequests(requests, 'time', errors)).toEqual(requests);
  });

  it('puts the slowest first and unknown durations last', () => {
    expect(paths(sortRequests(requests, 'slowest', errors))).toEqual([
      '/very-slow',
      '/slow',
      '/gql',
      '/404',
      '/ok',
      '/500',
      '/failed',
    ]);
  });

  it('puts problems first, most severe at the top', () => {
    expect(paths(sortRequests(requests, 'problems', errors))).toEqual([
      '/failed',
      '/500',
      '/404',
      '/gql',
      '/very-slow',
      '/slow',
      '/ok',
    ]);
  });

  it('filters down to errors, including GraphQL errors', () => {
    const filter = { text: '', jsonOnly: false, errorsOnly: true };
    expect(paths(filterRequests(requests, filter, errors))).toEqual([
      '/404',
      '/failed',
      '/gql',
      '/500',
    ]);
    expect(paths(filterRequests(requests, filter))).toEqual(['/404', '/failed', '/500']);
  });
});

describe('countRepeats', () => {
  it('counts identical requests sent within a second of each other', () => {
    const first = capture({ second: 1 });
    const second = capture({ second: 1, ms: 300 });
    const third = capture({ second: 2, ms: 100 });
    const later = capture({ second: 30 });
    const repeats = countRepeats([later, third, second, first]);
    expect(repeats.get(first.id)).toBe(3);
    expect(repeats.get(second.id)).toBe(3);
    expect(repeats.get(third.id)).toBe(3);
    expect(repeats.has(later.id)).toBe(false);
  });

  it('does not count requests that differ in query, method or body', () => {
    const requests = [
      capture({ url: 'https://x.test/api/users?page=1' }),
      capture({ url: 'https://x.test/api/users?page=2', ms: 10 }),
      capture({ method: 'POST', body: '{"a":1}', ms: 20 }),
      capture({ method: 'POST', body: '{"a":2}', ms: 30 }),
    ];
    expect(countRepeats(requests).size).toBe(0);
  });
});

describe('summarizeEndpoint', () => {
  it('summarises the calls to the same endpoint', () => {
    const selected = capture({ second: 3, time: 100 });
    const requests = [
      selected,
      capture({ second: 2, time: 300, status: 500 }),
      capture({ second: 1 }),
      capture({ url: 'https://x.test/api/orders', time: 9000 }),
    ];
    expect(summarizeEndpoint(selected, requests, NO_ERRORS)).toEqual({
      calls: 3,
      errors: 1,
      averageDuration: 200,
      slowestDuration: 300,
    });
  });

  it('leaves durations empty when none was reported', () => {
    const selected = capture();
    expect(summarizeEndpoint(selected, [selected], NO_ERRORS)).toMatchObject({
      calls: 1,
      averageDuration: null,
      slowestDuration: null,
    });
  });

  it('keeps GraphQL operations on one URL apart', () => {
    const url = 'https://x.test/graphql';
    const users = capture({
      url,
      method: 'POST',
      body: '{"query":"query Users { users { id } }"}',
    });
    const orders = capture({
      url,
      method: 'POST',
      second: 1,
      body: '{"query":"query Orders { orders { id } }"}',
    });
    expect(isSameEndpoint(users, orders)).toBe(false);
    expect(summarizeEndpoint(users, [users, orders], NO_ERRORS).calls).toBe(1);
  });
});
