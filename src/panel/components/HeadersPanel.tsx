import type { CapturedRequest } from '../../network/requests';
import { NameValueTable } from './NameValueTable';

export function HeadersPanel({ request }: { request: CapturedRequest }) {
  const general = [
    { name: 'Request URL', value: request.url },
    { name: 'Request method', value: request.method },
    { name: 'Status code', value: request.status === 0 ? 'failed' : String(request.status) },
  ];
  if (request.mimeType !== '') general.push({ name: 'Content type', value: request.mimeType });

  return (
    <NameValueTable
      sections={[
        { title: 'General', rows: general },
        { title: 'Response headers', rows: request.responseHeaders, mask: true },
        { title: 'Request headers', rows: request.requestHeaders, mask: true },
      ]}
    />
  );
}
