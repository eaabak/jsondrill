import { describe, expect, it } from 'vitest';
import { detectGraphql, findGraphqlErrors, graphqlLabel } from '../src/network/graphql';
import { decodeJwt, findJwt } from '../src/network/jwt';
import type { RequestPayload } from '../src/network/requests';

function jsonPayload(value: unknown): RequestPayload {
  return { mimeType: 'application/json', text: JSON.stringify(value), params: [] };
}

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

describe('detectGraphql', () => {
  it('reads the operation type and name from the query text', () => {
    const payload = jsonPayload({ query: 'mutation AddUser($name: String!) { addUser { id } }' });
    expect(detectGraphql(payload, [])).toEqual({ type: 'mutation', name: 'AddUser' });
  });

  it('prefers operationName and skips leading comments', () => {
    const payload = jsonPayload({
      query: '# cached\nquery A { a }\nquery B { b }',
      operationName: 'B',
    });
    expect(detectGraphql(payload, [])).toEqual({ type: 'query', name: 'B' });
  });

  it('accepts anonymous and shorthand queries', () => {
    expect(detectGraphql(jsonPayload({ query: '{ me { id } }' }), [])).toEqual({
      type: 'query',
      name: '',
    });
    expect(graphqlLabel({ type: 'query', name: '' })).toBe('query');
    expect(graphqlLabel({ type: 'mutation', name: 'AddUser' })).toBe('mutation AddUser');
  });

  it('joins the names of a batch', () => {
    const payload = jsonPayload([{ query: 'query Users { users }' }, { query: 'query Me { me }' }]);
    expect(detectGraphql(payload, [])).toEqual({ type: 'query', name: 'Users, Me' });
  });

  it('recognises persisted queries and GET requests', () => {
    const persisted = jsonPayload({
      operationName: 'Feed',
      extensions: { persistedQuery: { version: 1, sha256Hash: 'abc' } },
    });
    expect(detectGraphql(persisted, [])).toEqual({ type: 'query', name: 'Feed' });
    expect(detectGraphql(null, [{ name: 'query', value: 'query Search { search }' }])).toEqual({
      type: 'query',
      name: 'Search',
    });
  });

  it('ignores ordinary JSON and search parameters', () => {
    expect(detectGraphql(jsonPayload({ query: 'red shoes', page: 2 }), [])).toBeNull();
    expect(detectGraphql(jsonPayload({ name: 'Ada' }), [])).toBeNull();
    expect(detectGraphql(jsonPayload([1, 2]), [])).toBeNull();
    expect(detectGraphql(null, [{ name: 'query', value: 'red shoes' }])).toBeNull();
    expect(detectGraphql({ mimeType: 'text/plain', text: 'query', params: [] }, [])).toBeNull();
  });
});

describe('findGraphqlErrors', () => {
  it('returns the messages of the errors array', () => {
    const body = JSON.stringify({
      data: null,
      errors: [{ message: 'Not authorised' }, { extensions: { code: 'X' } }],
    });
    expect(findGraphqlErrors(body)).toEqual(['Not authorised', 'Unknown error']);
  });

  it('collects errors across a batch', () => {
    const body = JSON.stringify([{ data: {} }, { errors: [{ message: 'Boom' }] }]);
    expect(findGraphqlErrors(body)).toEqual(['Boom']);
  });

  it('finds nothing in successful, unrelated or broken bodies', () => {
    expect(findGraphqlErrors('{"data":{"me":null}}')).toEqual([]);
    expect(findGraphqlErrors('{"errors":[]}')).toEqual([]);
    expect(findGraphqlErrors('{"errors":"none"}')).toEqual([]);
    expect(findGraphqlErrors('<html>')).toEqual([]);
  });
});

describe('decodeJwt', () => {
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: 'user-1',
    name: 'Zoë',
    roles: ['admin'],
    iat: 1_700_000_000,
    exp: 1_700_003_600,
  })}.c2lnbmF0dXJl`;

  it('decodes the times and the claims without verifying the signature', () => {
    expect(decodeJwt(token, 'authorization')).toEqual({
      source: 'authorization',
      algorithm: 'HS256',
      expiresAt: 1_700_003_600_000,
      issuedAt: 1_700_000_000_000,
      notBefore: null,
      claims: [
        { name: 'sub', value: 'user-1' },
        { name: 'name', value: 'Zoë' },
        { name: 'roles', value: '["admin"]' },
        { name: 'iat', value: '1700000000' },
        { name: 'exp', value: '1700003600' },
      ],
    });
  });

  it('rejects values that are not tokens', () => {
    expect(decodeJwt('abc')).toBeNull();
    expect(decodeJwt('a.b.c')).toBeNull();
    expect(decodeJwt(`${encode([1])}.${encode({})}.x`)).toBeNull();
  });

  it('finds a bearer token in the request headers, Authorization first', () => {
    const headers = [
      { name: 'accept', value: '*/*' },
      { name: 'x-id-token', value: `${encode({ alg: 'none' })}.${encode({ sub: 'other' })}.` },
      { name: 'Authorization', value: `Bearer ${token}` },
    ];
    expect(findJwt(headers)?.source).toBe('Authorization');
    expect(findJwt(headers.slice(0, 2))?.source).toBe('x-id-token');
    expect(findJwt([{ name: 'authorization', value: 'Basic dXNlcjpwYXNz' }])).toBeNull();
  });

  it('finds a token stored in a cookie, after the other headers', () => {
    const cookie = { name: 'cookie', value: `theme=dark; token=${token}; XSRF-TOKEN=61b9e785` };
    expect(findJwt([cookie])).toMatchObject({ source: 'cookie "token"', algorithm: 'HS256' });
    expect(findJwt([cookie, { name: 'Authorization', value: `Bearer ${token}` }])?.source).toBe(
      'Authorization',
    );
    expect(findJwt([{ name: 'Cookie', value: `auth="Bearer%20${token}"` }])?.source).toBe(
      'cookie "auth"',
    );
    expect(findJwt([{ name: 'cookie', value: 'theme=dark; flag; sid=abc.def' }])).toBeNull();
  });
});
