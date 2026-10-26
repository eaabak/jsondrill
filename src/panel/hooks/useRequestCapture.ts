import { useCallback, useEffect, useState } from 'react';
import { mergeRequests, type CapturedRequest, type NetworkSource } from '../../network/requests';
import { getErrorMessage } from '../format';

export type CaptureStatus =
  { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string };

export function useRequestCapture(network: NetworkSource) {
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [selected, setSelected] = useState<CapturedRequest | null>(null);
  const [status, setStatus] = useState<CaptureStatus>({ kind: 'loading' });

  const clear = useCallback(() => {
    setRequests([]);
    setSelected(null);
  }, []);

  useEffect(() => {
    let active = true;
    // Subscribe before reading the HAR so requests finishing in between are not lost.
    const stopRequests = network.onRequest((request) => {
      setRequests((current) => mergeRequests(current, [request]));
    });
    const stopNavigation = network.onNavigated(clear);

    network.getRequests().then(
      (initial) => {
        if (!active) return;
        // Live events are fresher than the HAR snapshot, so they win on duplicates.
        setRequests((current) => mergeRequests(initial, current));
        setStatus({ kind: 'ready' });
      },
      (error: unknown) => {
        if (!active) return;
        setStatus({
          kind: 'error',
          message: getErrorMessage(error, 'Could not read captured requests.'),
        });
      },
    );

    return () => {
      active = false;
      stopRequests();
      stopNavigation();
    };
  }, [network, clear]);

  return { requests, selected, select: setSelected, clear, status };
}
