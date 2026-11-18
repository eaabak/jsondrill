import { useCallback, useEffect, useState } from 'react';
import type { NetworkSource, RecordingState } from '../../network/requests';

/** Whether JSONDrill records the inspected site while DevTools is closed. */
export function useRecording(network: NetworkSource) {
  const { recording } = network;
  const [state, setState] = useState<RecordingState>({ kind: 'unavailable' });

  const refresh = useCallback(() => {
    recording.getState().then(setState, () => setState({ kind: 'unavailable' }));
  }, [recording]);

  useEffect(() => {
    refresh();
    return network.onNavigated(refresh);
  }, [network, refresh]);

  const start = useCallback(() => {
    if (state.kind !== 'off') return;
    // Chrome only shows its prompt during the click, so nothing may be awaited before start().
    recording.start(state.pattern).then(refresh, refresh);
  }, [recording, refresh, state]);

  const stop = useCallback(() => {
    if (state.kind !== 'on') return;
    recording.stop(state.pattern).then(refresh, refresh);
  }, [recording, refresh, state]);

  return { state, start, stop };
}
