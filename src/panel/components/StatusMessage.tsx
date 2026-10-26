import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatusMessageProps {
  children: ReactNode;
  tone?: 'neutral' | 'error';
  action?: ReactNode;
}

export function StatusMessage({ children, tone = 'neutral', action }: StatusMessageProps) {
  const isError = tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className="flex h-full min-h-20 flex-col items-center justify-center gap-2 p-4 text-center"
    >
      <p className={`flex max-w-md items-start gap-1.5 ${isError ? 'text-error' : 'text-muted'}`}>
        {isError && <TriangleAlert size={14} className="mt-px shrink-0" aria-hidden />}
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}
