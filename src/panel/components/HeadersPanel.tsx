import { useMemo, useState } from 'react';
import { formatDuration } from '../../core';
import { graphqlLabel } from '../../network/graphql';
import { summarizeEndpoint } from '../../network/insights';
import { findJwt, type DecodedJwt } from '../../network/jwt';
import type { CapturedRequest, GraphqlErrors, RequestTimings } from '../../network/requests';
import { formatDateTime, formatRelativeTime } from '../format';
import { NameValueTable, type NameValueRow, type NameValueSection } from './NameValueTable';

interface HeadersPanelProps {
  request: CapturedRequest;
  requests: readonly CapturedRequest[];
  graphqlErrors: GraphqlErrors;
}

const PHASES: readonly { key: keyof RequestTimings; label: string; always?: boolean }[] = [
  { key: 'blocked', label: 'Queued or stalled' },
  { key: 'dns', label: 'DNS lookup' },
  { key: 'connect', label: 'Connecting' },
  { key: 'send', label: 'Sending request' },
  { key: 'wait', label: 'Waiting for server', always: true },
  { key: 'receive', label: 'Downloading response', always: true },
];
const PERCENT = 100;

export function HeadersPanel({ request, requests, graphqlErrors }: HeadersPanelProps) {
  // Token expiry is judged against the moment the request was opened.
  const [now] = useState(() => Date.now());
  const jwt = useMemo(() => findJwt(request.requestHeaders), [request]);
  const summary = useMemo(
    () => summarizeEndpoint(request, requests, graphqlErrors),
    [request, requests, graphqlErrors],
  );
  const errors = graphqlErrors.get(request.id);

  const general: NameValueRow[] = [
    { name: 'Request URL', value: request.url },
    { name: 'Request method', value: request.method },
    { name: 'Status code', value: request.status === 0 ? 'failed' : String(request.status) },
  ];
  if (request.mimeType !== '') general.push({ name: 'Content type', value: request.mimeType });
  if (request.graphql) {
    general.push({ name: 'GraphQL operation', value: graphqlLabel(request.graphql) });
  }
  if (errors) general.push({ name: 'GraphQL errors', value: errors.join('\n') });

  const endpoint: NameValueRow[] = [
    { name: 'Calls', value: String(summary.calls) },
    {
      name: 'Errors',
      value: String(summary.errors),
      note: `(${Math.round((summary.errors / summary.calls) * PERCENT)}%)`,
    },
  ];
  if (summary.averageDuration !== null && summary.slowestDuration !== null) {
    endpoint.push(
      { name: 'Average time', value: formatDuration(summary.averageDuration) },
      { name: 'Slowest call', value: formatDuration(summary.slowestDuration) },
    );
  }

  const sections: NameValueSection[] = [{ title: 'General', rows: general }];
  const timing = getTimingRows(request);
  if (timing.length > 0) sections.push({ title: 'Timing', rows: timing });
  sections.push({ title: 'This endpoint', rows: endpoint });
  if (jwt) {
    sections.push(
      { title: `Token in ${jwt.source} (not verified)`, rows: getTokenRows(jwt, now) },
      { title: 'Token claims', rows: jwt.claims, mask: 'all' },
    );
  }
  sections.push(
    { title: 'Response headers', rows: request.responseHeaders, mask: true },
    { title: 'Request headers', rows: request.requestHeaders, mask: true },
  );

  return (
    <>
      {request.recordedInPage && (
        <p className="m-0 shrink-0 border-b border-line bg-surface-alt px-2 py-1 text-muted">
          Recorded while DevTools was closed. Headers the browser adds itself, such as cookies, and
          the timing breakdown are not available.
        </p>
      )}
      <NameValueTable sections={sections} />
    </>
  );
}

function getTimingRows({ duration, timings }: CapturedRequest): NameValueRow[] {
  const rows: NameValueRow[] = [];
  for (const { key, label, always } of PHASES) {
    const value = timings?.[key] ?? null;
    if (value === null || (value === 0 && !always)) continue;
    const row: NameValueRow = { name: label, value: formatDuration(value) };
    if (duration !== null && duration > 0) {
      row.note = `(${Math.round((value / duration) * PERCENT)}%)`;
    }
    rows.push(row);
  }
  if (duration !== null) rows.push({ name: 'Total', value: formatDuration(duration) });
  return rows;
}

function getTokenRows(jwt: DecodedJwt, now: number): NameValueRow[] {
  const rows: NameValueRow[] = [];
  if (jwt.algorithm !== null) rows.push({ name: 'Algorithm', value: jwt.algorithm });
  if (jwt.expiresAt === null) {
    rows.push({ name: 'Expires', value: 'never (no exp claim)' });
  } else {
    const isExpired = jwt.expiresAt <= now;
    rows.push({
      name: isExpired ? 'Expired' : 'Expires',
      value: formatDateTime(jwt.expiresAt),
      note: `(${formatRelativeTime(jwt.expiresAt, now)})`,
    });
  }
  if (jwt.issuedAt !== null) {
    rows.push({
      name: 'Issued',
      value: formatDateTime(jwt.issuedAt),
      note: `(${formatRelativeTime(jwt.issuedAt, now)})`,
    });
  }
  if (jwt.notBefore !== null) {
    rows.push({ name: 'Not valid before', value: formatDateTime(jwt.notBefore) });
  }
  return rows;
}
