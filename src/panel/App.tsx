import { useState } from 'react';
import type { NetworkSource } from '../network/requests';
import { RequestList } from './components/RequestList';
import { RequestPanel, type DetailTab } from './components/RequestPanel';
import { Splitter } from './components/Splitter';
import { StatusMessage } from './components/StatusMessage';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useRequestCapture } from './hooks/useRequestCapture';
import { useStoredSize } from './hooks/useStoredSize';

// Matches Tailwind's `md` breakpoint, where the request list moves beside the details.
const SIDE_BY_SIDE = '(min-width: 48rem)';
const MIN_LIST_WIDTH = 160;
const MIN_LIST_HEIGHT = 96;
const MIN_DETAILS_WIDTH = 240;
const MIN_DETAILS_HEIGHT = 160;

export function App({ network }: { network: NetworkSource }) {
  const { requests, selected, select, clear, status } = useRequestCapture(network);
  const [tab, setTab] = useState<DetailTab>('response');
  const isSideBySide = useMediaQuery(SIDE_BY_SIDE);
  const [listWidth, setListWidth] = useStoredSize('jsondrill.requestListWidth');
  const [listHeight, setListHeight] = useStoredSize('jsondrill.requestListHeight');

  let listStyle;
  if (isSideBySide && listWidth !== null) {
    listStyle = {
      width: `clamp(${MIN_LIST_WIDTH}px, ${listWidth}px, calc(100% - ${MIN_DETAILS_WIDTH}px))`,
    };
  } else if (!isSideBySide && listHeight !== null) {
    listStyle = {
      height: `clamp(${MIN_LIST_HEIGHT}px, ${listHeight}px, calc(100% - ${MIN_DETAILS_HEIGHT}px))`,
    };
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <RequestList
        className="flex h-2/5 min-h-0 min-w-0 shrink-0 flex-col md:h-full md:w-72"
        style={listStyle}
        requests={requests}
        status={status}
        selectedId={selected?.id ?? null}
        onSelect={select}
        onClear={clear}
        onReload={() => network.reloadPage()}
      />
      <Splitter
        orientation={isSideBySide ? 'vertical' : 'horizontal'}
        label="Resize request list"
        min={isSideBySide ? MIN_LIST_WIDTH : MIN_LIST_HEIGHT}
        reserve={isSideBySide ? MIN_DETAILS_WIDTH : MIN_DETAILS_HEIGHT}
        onResize={isSideBySide ? setListWidth : setListHeight}
        onReset={() => (isSideBySide ? setListWidth(null) : setListHeight(null))}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected ? (
          <RequestPanel
            key={selected.id}
            request={selected}
            requests={requests}
            tab={tab}
            onTabChange={setTab}
          />
        ) : (
          <StatusMessage>
            Select a request to inspect its response, payload and headers.
          </StatusMessage>
        )}
      </main>
    </div>
  );
}
