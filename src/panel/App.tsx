import type { NetworkSource } from '../network/requests';
import { RequestList } from './components/RequestList';
import { ResponsePanel } from './components/ResponsePanel';
import { StatusMessage } from './components/StatusMessage';
import { useRequestCapture } from './hooks/useRequestCapture';

export function App({ network }: { network: NetworkSource }) {
  const { requests, selected, select, clear, status } = useRequestCapture(network);

  return (
    <div className="flex h-full flex-col md:flex-row">
      <RequestList
        className="flex h-2/5 shrink-0 flex-col border-b border-line md:h-full md:w-72 md:border-r md:border-b-0"
        requests={requests}
        status={status}
        selectedId={selected?.id ?? null}
        onSelect={select}
        onClear={clear}
        onReload={() => network.reloadPage()}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected ? (
          <ResponsePanel key={selected.id} request={selected} />
        ) : (
          <StatusMessage>Select a request to inspect its JSON response.</StatusMessage>
        )}
      </main>
    </div>
  );
}
