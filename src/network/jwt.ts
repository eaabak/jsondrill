import type { NameValue } from './requests';

export interface DecodedJwt {
  /** Name of the header the token was found in. */
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
const MS_PER_SECOND = 1000;

/**
 * Decodes the first JSON Web Token found in the request headers, `Authorization` first.
 * The signature is not verified; decoding only reads what the token already carries.
 */
export function findJwt(headers: readonly NameValue[]): DecodedJwt | null {
  const ordered = headers.toSorted(
    (a, b) => Number(isAuthorization(b.name)) - Number(isAuthorization(a.name)),
  );
  for (const { name, value } of ordered) {
    if (name.toLowerCase() === 'cookie') continue;
    const decoded = decodeJwt(value.trim().replace(AUTH_SCHEME, ''), name);
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
