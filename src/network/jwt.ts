import type { NameValue } from './requests';

export interface DecodedJwt {
  /** Where the token was found: a header name, or `cookie "name"` for a cookie. */
  source: string;
  algorithm: string | null;
  /** Milliseconds since the epoch, or null when the claim is absent. */
  expiresAt: number | null;
  issuedAt: number | null;
  notBefore: number | null;
  claims: readonly NameValue[];
}

const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]*$/;
const AUTH_SCHEME = /^(?:bearer|jwt|token)\s+/i;
// Some servers put the whole header value in the cookie: `Bearer%20<token>`.
const ENCODED_AUTH_SCHEME = /^(?:bearer|jwt|token)(?:%20|\+|\s)+/i;
const COOKIE_QUOTES = /^"|"$/g;
const MS_PER_SECOND = 1000;

/**
 * Decodes the first JSON Web Token in the request headers: `Authorization` first, then the other
 * headers, then the cookies. The signature is not verified.
 */
export function findJwt(headers: readonly NameValue[]): DecodedJwt | null {
  const ordered = headers.toSorted(
    (a, b) => Number(isAuthorization(b.name)) - Number(isAuthorization(a.name)),
  );
  for (const { name, value } of ordered) {
    if (isCookie(name)) continue;
    const decoded = decodeJwt(value.trim().replace(AUTH_SCHEME, ''), name);
    if (decoded) return decoded;
  }
  for (const { name, value } of ordered) {
    if (!isCookie(name)) continue;
    const decoded = findJwtInCookies(value);
    if (decoded) return decoded;
  }
  return null;
}

function findJwtInCookies(cookieHeader: string): DecodedJwt | null {
  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair
      .slice(separator + 1)
      .trim()
      .replace(COOKIE_QUOTES, '');
    const decoded = decodeJwt(value.replace(ENCODED_AUTH_SCHEME, ''), `cookie "${name}"`);
    if (decoded) return decoded;
  }
  return null;
}

export function decodeJwt(token: string, source = ''): DecodedJwt | null {
  if (!JWT_SHAPE.test(token)) return null;
  const [headerPart = '', payloadPart = ''] = token.split('.');
  const header = decodeSegment(headerPart);
  const payload = decodeSegment(payloadPart);
  if (!header || !payload) return null;
  return {
    source,
    algorithm: typeof header.alg === 'string' ? header.alg : null,
    expiresAt: toTimestamp(payload.exp),
    issuedAt: toTimestamp(payload.iat),
    notBefore: toTimestamp(payload.nbf),
    claims: Object.entries(payload).map(([name, value]) => ({
      name,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    })),
  };
}

function isAuthorization(name: string): boolean {
  return name.toLowerCase() === 'authorization';
}

function isCookie(name: string): boolean {
  return name.toLowerCase() === 'cookie';
}

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const base64 = segment.replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function toTimestamp(seconds: unknown): number | null {
  return typeof seconds === 'number' && Number.isFinite(seconds) ? seconds * MS_PER_SECOND : null;
}
