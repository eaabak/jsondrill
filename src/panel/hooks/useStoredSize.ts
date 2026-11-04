import { useEffect, useState } from 'react';

export function useStoredSize(key: string) {
  const [size, setSize] = useState<number | null>(() => {
    try {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (size === null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(Math.round(size)));
    } catch {
      // Storage can be unavailable; the size then resets next time.
    }
  }, [key, size]);

  return [size, setSize] as const;
}
