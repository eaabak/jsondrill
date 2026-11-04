import type { CapturedRequest } from '../../network/requests';
import { getExportFileName } from '../exporting';
import { useResponseJson } from '../hooks/useResponseJson';
import { JsonExplorer } from './JsonExplorer';
import { StatusMessage } from './StatusMessage';

export function ResponsePanel({ request }: { request: CapturedRequest }) {
  const response = useResponseJson(request);

  switch (response.kind) {
    case 'loading':
      return <StatusMessage>Loading response…</StatusMessage>;
    case 'error':
      return <StatusMessage tone="error">{response.message}</StatusMessage>;
    case 'ready':
      return (
        <JsonExplorer
          data={response.data}
          precisionLoss={response.precisionLoss}
          exportName={getExportFileName(request.path)}
        />
      );
  }
}
