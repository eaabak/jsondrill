import type { NameValue, RequestPayload } from './requests';

export type GraphqlOperationType = 'query' | 'mutation' | 'subscription';

/** A GraphQL call. Batched calls join their operation names and take the first type. */
export interface GraphqlCall {
  type: GraphqlOperationType;
  /** Empty for anonymous operations. */
  name: string;
}

const MAX_PAYLOAD_CHARS = 1_000_000;
const MAX_ERROR_MESSAGES = 20;
const OPERATION_START = /^\s*(?:#[^\n]*\n\s*)*(query|mutation|subscription)\b\s*([A-Za-z_]\w*)?/;
const SHORTHAND_QUERY = /^\s*(?:#[^\n]*\n\s*)*\{/;
const JSON_START = /^\s*[[{]/;

export function detectGraphql(
  payload: RequestPayload | null,
  queryParams: readonly NameValue[],
): GraphqlCall | null {
  return fromBody(payload) ?? fromQueryParams(queryParams);
}

export function graphqlLabel({ type, name }: GraphqlCall): string {
  return name === '' ? type : `${type} ${name}`;
}

/**
 * Error messages of a GraphQL response body. GraphQL reports failures in an `errors` array,
 * usually with HTTP status 200, so the status alone does not reveal them.
 */
export function findGraphqlErrors(body: string): string[] {
  const parsed = parseJsonSafely(body);
  const responses = Array.isArray(parsed) ? parsed : [parsed];
  const messages: string[] = [];
  for (const response of responses) {
    if (!isRecord(response) || !Array.isArray(response.errors)) continue;
    for (const error of response.errors) {
      const message = isRecord(error) && typeof error.message === 'string' ? error.message : '';
      messages.push(message === '' ? 'Unknown error' : message);
    }
  }
  return messages.slice(0, MAX_ERROR_MESSAGES);
}

function fromBody(payload: RequestPayload | null): GraphqlCall | null {
  if (!payload || payload.text.length > MAX_PAYLOAD_CHARS || !JSON_START.test(payload.text)) {
    return null;
  }
  const parsed = parseJsonSafely(payload.text);
  const operations = Array.isArray(parsed) ? parsed : [parsed];
  const calls: GraphqlCall[] = [];
  for (const operation of operations) {
    if (!isRecord(operation)) return null;
    const call = toCall(operation.query, operation.operationName, operation.extensions);
    if (!call) return null;
    calls.push(call);
  }
  const first = calls[0];
  if (!first) return null;
  return {
    type: first.type,
    name: calls
      .map((call) => call.name)
      .filter((name) => name !== '')
      .join(', '),
  };
}

function fromQueryParams(queryParams: readonly NameValue[]): GraphqlCall | null {
  const get = (name: string) => queryParams.find((param) => param.name === name)?.value;
  const extensions = get('extensions');
  return toCall(
    get('query'),
    get('operationName'),
    extensions === undefined ? undefined : parseJsonSafely(extensions),
  );
}

function toCall(query: unknown, operationName: unknown, extensions: unknown): GraphqlCall | null {
  const name = typeof operationName === 'string' ? operationName : '';
  if (typeof query === 'string') {
    const match = OPERATION_START.exec(query);
    if (match) return { type: toType(match[1]), name: name === '' ? (match[2] ?? '') : name };
    return SHORTHAND_QUERY.test(query) ? { type: 'query', name } : null;
  }
  // Persisted queries send a hash instead of the query text.
  const isPersisted = isRecord(extensions) && isRecord(extensions.persistedQuery);
  return isPersisted && name !== '' ? { type: 'query', name } : null;
}

function toType(keyword: string | undefined): GraphqlOperationType {
  return keyword === 'mutation' || keyword === 'subscription' ? keyword : 'query';
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
