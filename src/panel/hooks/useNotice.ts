import { useEffect, useState } from 'react';

export interface Notice {
  tone: 'success' | 'error';
  text: string;
}

const NOTICE_DURATION_MS = 2_500;

/** A short status message that clears itself. */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return [notice, setNotice] as const;
}
