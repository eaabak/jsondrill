import { useEffect, useRef, useState } from 'react';
import { findGraphqlErrors } from '../../network/graphql';
import { isFailedStatus, type CapturedRequest, type GraphqlErrors } from '../../network/requests';

// Larger bodies are not worth reading just to look for an `errors` field.
const MAX_CHECKED_BYTES = 5 * 1024 * 1024;

/**
 * GraphQL reports failures inside a successful response, so the bodies of GraphQL calls are read
 * as they arrive to look for an `errors` field. Other responses are still read only on selection.
 */
export function useGraphqlErrors(requests: readonly CapturedRequest[]): GraphqlErrors {
  const [errors, setErrors] = useState<GraphqlErrors>(() => new Map());
  const checked = useRef(new Set<string>());
  const live = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const ids = new Set(requests.map((request) => request.id));
    live.current = ids;
    for (const id of checked.current) if (!ids.has(id)) checked.current.delete(id);

    for (const request of requests) {
      if (!shouldCheck(request) || checked.current.has(request.id)) continue;
      checked.current.add(request.id);
      request.readBody().then(
        (body) => {
          const messages = findGraphqlErrors(body);
          if (messages.length === 0) return;
          setErrors((current) => {
            // Also drops entries of requests that have left the list since.
            const next = new Map([...current].filter(([id]) => live.current.has(id)));
            if (live.current.has(request.id)) next.set(request.id, messages);
            return next;
          });
        },
        () => {
          // An unreadable body just leaves the request without GraphQL errors.
        },
      );
    }
  }, [requests]);

  return errors;
}

function shouldCheck(request: CapturedRequest): boolean {
  return (
    request.graphql !== null && !isFailedStatus(request.status) && request.size <= MAX_CHECKED_BYTES
  );
}
