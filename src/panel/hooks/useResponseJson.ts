import { useEffect, useState } from 'react';
import { getSizeLimitError, parseJson } from '../../core';
import type { CapturedRequest } from '../../network/requests';
import { getErrorMessage } from '../format';

export type ResponseState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: unknown; precisionLoss: boolean };

interface LoadedResponse {
  request: CapturedRequest;
  state: ResponseState;
}

const LOADING: ResponseState = { kind: 'loading' };

export function useResponseJson(request: CapturedRequest): ResponseState {
  const [loaded, setLoaded] = useState<LoadedResponse | null>(null);

  useEffect(() => {
    let active = true;
    void loadResponse(request).then((state) => {
      if (active) setLoaded({ request, state });
    });
    return () => {
      active = false;
    };
  }, [request]);

  return loaded?.request === request ? loaded.state : LOADING;
}

async function loadResponse(request: CapturedRequest): Promise<ResponseState> {
  const sizeError = getSizeLimitError(request.size);
  if (sizeError) return { kind: 'error', message: sizeError };

  let text: string;
  try {
    text = await request.readBody();
  } catch (error) {
    return { kind: 'error', message: getErrorMessage(error, 'Could not read the response body.') };
  }

  const parsed = parseJson(text);
  return parsed.ok
    ? { kind: 'ready', data: parsed.value, precisionLoss: parsed.precisionLoss }
    : { kind: 'error', message: parsed.message };
}
