import { describe, expect, it } from 'vitest';
import { createCapturedRequest, type HarEntryLike } from '../src/network/requests';
import { HIDDEN, toBugReport, toCurl, toFetch } from '../src/network/share';

const SHOW = { hideSecrets: false };
const HIDE = { hideSecrets: true };

function capture(request: Partial<HarEntryLike['request']>, status = 200, time = 1240) {
  const entry: HarEntryLike = {
    startedDateTime: '2026-01-01T10:00:00.000Z',
    time,
    request: { method: 'GET', url: 'https://api.example.com/v1/users', ...request },
    response: {
      status,
      headers: [
        { name: 'content-type', value: 'application/json' },
        { name: 'x-request-id', value: 'req-42' },
      ],
      content: { mimeType: 'application/json', size: 10 },
    },
  };
  return createCapturedRequest(entry, () => Promise.resolve('{}'));
}

const login = capture(
  {
    method: 'POST',
    url: 'https://api.example.com/login?api_key=k-1&page=2',
    headers: [
      { name: ':authority', value: 'api.example.com' },
      { name: 'accept-encoding', value: 'gzip' },
      { name: 'content-length', value: '40' },
      { name: 'content-type', value: 'application/json' },
      { name: 'cookie', value: 'sid=abc' },
      { name: 'authorization', value: 'Bearer secret' },
      { name: 'x-note', value: "it's fine" },
    ],
    postData: {
      mimeType: 'application/json',
      text: '{"user":"zoe","password":"hunter2","profile":{"refreshToken":"r-1","age":30}}',
    },
  },
  500,
);

describe('toCurl', () => {
  it('rebuilds the request and leaves out headers the client computes', () => {
    expect(toCurl(login, SHOW)).toBe(
      [
        "curl 'https://api.example.com/login?api_key=k-1&page=2'",
        '-X POST',
        "-H 'authorization: Bearer secret'",
        "-H 'content-type: application/json'",
        "-H 'cookie: sid=abc'",
        String.raw`-H 'x-note: it'\''s fine'`,
        `--data-raw '{"user":"zoe","password":"hunter2","profile":{"refreshToken":"r-1","age":30}}'`,
      ].join(' \\\n  '),
    );
  });

  it('hides credentials in the headers, the query string and the body', () => {
    const curl = toCurl(login, HIDE);
    expect(curl).toContain(`'https://api.example.com/login?api_key=${HIDDEN}&page=2'`);
    expect(curl).toContain(`-H 'authorization: ${HIDDEN}'`);
    expect(curl).toContain(`-H 'cookie: ${HIDDEN}'`);
    expect(curl).toContain(
      `{"user":"zoe","password":"${HIDDEN}","profile":{"refreshToken":"${HIDDEN}","age":30}}`,
    );
    expect(curl).not.toMatch(/hunter2|secret|sid=abc|k-1|r-1/);
  });

  it('keeps a plain GET short and encodes form fields', () => {
    expect(toCurl(capture({}), HIDE)).toBe("curl 'https://api.example.com/v1/users'");
    const form = capture({
      method: 'POST',
      postData: {
        mimeType: 'application/x-www-form-urlencoded; charset=UTF-8',
        text: 'name=Zo%C3%AB+B&password=p%26w',
      },
    });
    expect(toCurl(form, SHOW)).toContain("--data-raw 'name=Zo%C3%AB+B&password=p%26w'");
    expect(toCurl(form, HIDE)).toContain(`--data-raw 'name=Zo%C3%AB%20B&password=${HIDDEN}'`);
  });
});

describe('toFetch', () => {
  it('drops headers scripts cannot set and sends cookies through credentials', () => {
    const code = toFetch(login, SHOW);
    expect(
      code.startsWith('await fetch("https://api.example.com/login?api_key=k-1&page=2", {'),
    ).toBe(true);
    const init = JSON.parse(code.slice(code.indexOf('{'), code.lastIndexOf('}') + 1)) as unknown;
    expect(init).toEqual({
      method: 'POST',
      headers: {
        authorization: 'Bearer secret',
        'content-type': 'application/json',
        'x-note': "it's fine",
      },
      body: '{"user":"zoe","password":"hunter2","profile":{"refreshToken":"r-1","age":30}}',
      credentials: 'include',
    });
  });

  it('hides credentials and leaves GET without a body', () => {
    expect(toFetch(login, HIDE)).not.toMatch(/hunter2|Bearer secret|k-1/);
    expect(toFetch(capture({}), HIDE)).toBe(
      'await fetch("https://api.example.com/v1/users", {\n  "method": "GET",\n  "headers": {}\n});',
    );
  });
});

describe('toBugReport', () => {
  it('summarises the request, both bodies and how to reproduce it', () => {
    const report = toBugReport(login, {
      hideSecrets: true,
      responseBody: '{"error":"boom","access_token":"t-1","id":12345678901234567890}',
      graphqlErrors: ['Not allowed'],
    });
    expect(report).toContain(`## POST /login?api_key=${HIDDEN}&page=2 returned 500\n`);
    expect(report).toContain(`- **URL:** https://api.example.com/login?api_key=${HIDDEN}&page=2`);
    expect(report).toContain('- **Duration:** 1.2 s');
    expect(report).toContain('- **Time:** 2026-01-01T10:00:00.000Z');
    expect(report).toContain('- **x-request-id:** req-42');
    expect(report).toContain('### GraphQL errors\n\n- Not allowed');
    expect(report).toContain('### Request body\n\n```json\n{\n  "user": "zoe",');
    expect(report).toContain(
      `### Response\n\n\`\`\`json\n{\n  "error": "boom",\n  "access_token": "${HIDDEN}",\n  "id": 12345678901234567890\n}\n\`\`\``,
    );
    expect(report).toContain('### Reproduce\n\n```bash\ncurl ');
    expect(report).not.toMatch(/hunter2|Bearer secret|t-1|sid=abc/);
  });

  it('handles failed requests, missing bodies, long bodies and backticks', () => {
    const failed = toBugReport(capture({}, 0), { hideSecrets: true, responseBody: null });
    expect(failed).toContain('## GET /v1/users failed (no response)');
    expect(failed).toContain('_The response body is not available._');
    expect(failed).not.toContain('### Request body');

    const long = toBugReport(capture({}), { hideSecrets: false, responseBody: 'x'.repeat(4010) });
    expect(long).toContain(`${'x'.repeat(4000)}\n… (10 more characters)`);

    const ticks = toBugReport(capture({}), { hideSecrets: false, responseBody: 'a ``` b' });
    expect(ticks).toContain('````\na ``` b\n````');
  });
});
