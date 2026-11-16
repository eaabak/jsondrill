import { Bug, Check, ChevronDown, Copy, Globe, SquareTerminal } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { CapturedRequest } from '../../network/requests';
import { toBugReport, toCurl, toFetch } from '../../network/share';
import { copyText } from '../exporting';
import { getErrorMessage } from '../format';
import { useNotice } from '../hooks/useNotice';

type FormatId = 'report' | 'curl' | 'fetch';

const FORMATS: readonly { id: FormatId; icon: ReactNode; label: string; hint: string }[] = [
  {
    id: 'report',
    icon: <Bug size={14} aria-hidden />,
    label: 'Bug report',
    hint: 'A summary of the request and response, for Jira or GitHub',
  },
  {
    id: 'curl',
    icon: <SquareTerminal size={14} aria-hidden />,
    label: 'cURL command',
    hint: 'Send this request again from a terminal',
  },
  {
    id: 'fetch',
    icon: <Globe size={14} aria-hidden />,
    label: 'fetch() call',
    hint: 'Send this request again from the browser console',
  },
];

interface CopyMenuProps {
  request: CapturedRequest;
  graphqlErrors: readonly string[] | undefined;
}

const HIDE_SECRETS_KEY = 'jsondrill.copyHideSecrets';

export function CopyMenu({ request, graphqlErrors }: CopyMenuProps) {
  const [open, setOpen] = useState(false);
  const [hideSecrets, setHideSecrets] = useState(readHideSecrets);
  const [notice, setNotice] = useNotice();
  const container = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  const toggleHideSecrets = (next: boolean) => {
    setHideSecrets(next);
    try {
      localStorage.setItem(HIDE_SECRETS_KEY, String(next));
    } catch {
      // Storage can be unavailable; the choice then resets next time.
    }
  };

  const build = async (id: FormatId): Promise<string> => {
    if (id === 'curl') return toCurl(request, { hideSecrets });
    if (id === 'fetch') return toFetch(request, { hideSecrets });
    return toBugReport(request, {
      hideSecrets,
      responseBody: await request.readBody().catch(() => null),
      ...(graphqlErrors && { graphqlErrors }),
    });
  };

  const copy = async (id: FormatId, label: string) => {
    setOpen(false);
    try {
      await copyText(await build(id));
      setNotice({ tone: 'success', text: `${label} copied` });
    } catch (error) {
      setNotice({ tone: 'error', text: getErrorMessage(error, 'Copy failed.') });
    }
  };

  const close = () => {
    setOpen(false);
    container.current?.querySelector('button')?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(
      container.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const current = items.findIndex((item) => item === document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const first = step === 1 ? 0 : items.length - 1;
    items[current === -1 ? first : (current + step + items.length) % items.length]?.focus();
  };

  return (
    <div
      ref={container}
      className="relative flex shrink-0 items-center gap-2 border-l border-line px-1"
    >
      {notice && (
        <span
          role="status"
          className={`flex items-center gap-1 pl-1 ${notice.tone === 'error' ? 'text-error' : 'text-success'}`}
        >
          {notice.tone === 'success' && <Check size={12} aria-hidden />}
          {notice.text}
        </span>
      )}
      <button
        type="button"
        className="jd-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        title="Copy this request as a bug report, cURL command or fetch() call"
      >
        <Copy size={12} aria-hidden />
        Copy as
        <ChevronDown size={12} aria-hidden />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute top-full right-1 z-20 mt-px w-72 max-w-[calc(100vw-1rem)] rounded-sm border border-line bg-surface shadow-lg"
        >
          <div
            role="menu"
            tabIndex={-1}
            aria-label="Copy this request as"
            className="py-1"
            onKeyDown={handleKeyDown}
          >
            {FORMATS.map((format) => (
              <button
                key={format.id}
                type="button"
                role="menuitem"
                className="flex w-full items-start gap-2 px-2.5 py-1.5 text-left hover:bg-hover focus-visible:bg-hover"
                onClick={() => void copy(format.id, format.label)}
              >
                <span className="mt-0.5 shrink-0 text-muted">{format.icon}</span>
                <span className="min-w-0">
                  <span className="block font-semibold">{format.label}</span>
                  <span className="block text-muted">{format.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-start gap-2 border-t border-line bg-surface-alt px-2.5 py-1.5">
            <input
              id={`${menuId}-hide`}
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={hideSecrets}
              aria-describedby={`${menuId}-hide-hint`}
              onChange={(event) => toggleHideSecrets(event.target.checked)}
              onKeyDown={handleKeyDown}
            />
            <div className="min-w-0">
              <label htmlFor={`${menuId}-hide`} className="block">
                Hide tokens, cookies and passwords
              </label>
              <span
                id={`${menuId}-hide-hint`}
                className={`block ${hideSecrets ? 'text-muted' : 'text-warning'}`}
              >
                {hideSecrets
                  ? 'Safe to share. Turn off to copy a request that runs as is.'
                  : 'The copy contains your credentials. Do not share it.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function readHideSecrets(): boolean {
  try {
    return localStorage.getItem(HIDE_SECRETS_KEY) !== 'false';
  } catch {
    return true;
  }
}
