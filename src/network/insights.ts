import { isSameEndpoint, type CapturedRequest, type GraphqlErrors } from './requests';

export const SLOW_MS = 1000;
export const VERY_SLOW_MS = 3000;
/** Identical requests starting this close to each other count as one burst of repeats. */
export const REPEAT_WINDOW_MS = 1000;

const FIRST_SERVER_ERROR_STATUS = 500;
const FIRST_CLIENT_ERROR_STATUS = 400;

export type RequestSpeed = 'normal' | 'slow' | 'very-slow';

/** The most serious problem of a request, listed from most to least severe. */
export const REQUEST_ISSUES = [
  'failed',
  'server-error',
  'client-error',
  'graphql-error',
  'very-slow',
  'slow',
  'none',
] as const;

export type RequestIssue = (typeof REQUEST_ISSUES)[number];

export type RequestOrder = 'time' | 'slowest' | 'problems';

export interface EndpointSummary {
  calls: number;
  /** Calls that failed, returned an HTTP error or carried GraphQL errors. */
  errors: number;
  /** Null when no call reported a duration. */
  averageDuration: number | null;
  slowestDuration: number | null;
}

export function getRequestSpeed(duration: number | null): RequestSpeed {
  if (duration === null || duration < SLOW_MS) return 'normal';
  return duration < VERY_SLOW_MS ? 'slow' : 'very-slow';
}

export function hasRequestError(request: CapturedRequest, graphqlErrors: GraphqlErrors): boolean {
  return getErrorIssue(request, graphqlErrors) !== null;
}

export function getRequestIssue(
  request: CapturedRequest,
  graphqlErrors: GraphqlErrors,
): RequestIssue {
  const error = getErrorIssue(request, graphqlErrors);
  if (error) return error;
  const speed = getRequestSpeed(request.duration);
  return speed === 'normal' ? 'none' : speed;
}

/** Sorts a list kept in time order; requests that tie stay in that order. */
export function sortRequests(
  requests: readonly CapturedRequest[],
  order: RequestOrder,
  graphqlErrors: GraphqlErrors,
): CapturedRequest[] {
  if (order === 'slowest') {
    return requests.toSorted((a, b) => (b.duration ?? -1) - (a.duration ?? -1));
  }
  if (order === 'problems') {
    const rank = new Map(
      requests.map((request) => [
        request.id,
        REQUEST_ISSUES.indexOf(getRequestIssue(request, graphqlErrors)),
      ]),
    );
    return requests.toSorted((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }
  return [...requests];
}

/**
 * Finds requests sent again with the same method, URL and body within a short time, a common
 * sign of a double fetch. Maps each repeated request's id to the size of its burst.
 */
export function countRepeats(requests: readonly CapturedRequest[]): Map<string, number> {
  const groups = new Map<string, CapturedRequest[]>();
  for (const request of requests) {
    const key = `${request.method} ${request.url}\n${request.payload?.text ?? ''}`;
    const group = groups.get(key);
    if (group) group.push(request);
    else groups.set(key, [request]);
  }

  const repeats = new Map<string, number>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const ordered = group.toSorted((a, b) => a.startedAt - b.startedAt);
    let burst: CapturedRequest[] = [];
    const flush = () => {
      if (burst.length > 1) for (const request of burst) repeats.set(request.id, burst.length);
    };
    for (const request of ordered) {
      const previous = burst.at(-1);
      if (previous && request.startedAt - previous.startedAt > REPEAT_WINDOW_MS) {
        flush();
        burst = [];
      }
      burst.push(request);
    }
    flush();
  }
  return repeats;
}

export function summarizeEndpoint(
  request: CapturedRequest,
  requests: readonly CapturedRequest[],
  graphqlErrors: GraphqlErrors,
): EndpointSummary {
  const calls = requests.filter((candidate) => isSameEndpoint(candidate, request));
  const durations = calls.flatMap(({ duration }) => (duration === null ? [] : [duration]));
  return {
    calls: calls.length,
    errors: calls.filter((call) => hasRequestError(call, graphqlErrors)).length,
    averageDuration:
      durations.length === 0
        ? null
        : durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
    slowestDuration: durations.length === 0 ? null : Math.max(...durations),
  };
}

function getErrorIssue(
  request: CapturedRequest,
  graphqlErrors: GraphqlErrors,
): RequestIssue | null {
  const { status } = request;
  if (status === 0) return 'failed';
  if (status >= FIRST_SERVER_ERROR_STATUS) return 'server-error';
  if (status >= FIRST_CLIENT_ERROR_STATUS) return 'client-error';
  return graphqlErrors.has(request.id) ? 'graphql-error' : null;
}
