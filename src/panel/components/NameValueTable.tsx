import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { isSensitiveName, type NameValue } from '../../network/requests';

export interface NameValueRow extends NameValue {
  note?: string;
}

export interface NameValueSection {
  title: string;
  rows: readonly NameValueRow[];
  mask?: boolean;
}

const MASK = '••••••••';

export function NameValueTable({ sections }: { sections: readonly NameValueSection[] }) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const headingId = useId();

  const toggle = (key: string) => {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {sections.map((section, sectionIndex) => (
        <section key={section.title} aria-labelledby={`${headingId}-${sectionIndex}`}>
          <h3
            id={`${headingId}-${sectionIndex}`}
            className="sticky top-0 z-10 m-0 border-b border-line bg-surface-alt px-2 py-1 text-xs font-semibold"
          >
            {section.title}
            <span className="font-normal text-muted"> ({section.rows.length})</span>
          </h3>
          {section.rows.length === 0 ? (
            <p className="m-0 border-b border-line/50 px-2 py-1 text-muted">None</p>
          ) : (
            <table className="w-full table-fixed border-collapse font-mono text-[11px]">
              <colgroup>
                <col className="w-[35%] max-w-56" />
                <col />
              </colgroup>
              <tbody>
                {section.rows.map((row, rowIndex) => {
                  const key = `${sectionIndex}:${rowIndex}`;
                  const isSensitive =
                    section.mask === true && row.value !== '' && isSensitiveName(row.name);
                  const isHidden = isSensitive && !revealed.has(key);
                  return (
                    <tr key={key} className="border-b border-line/50 align-top">
                      <th
                        scope="row"
                        className="px-2 py-0.5 text-left font-normal break-all text-syntax-key"
                      >
                        {row.name}
                      </th>
                      <td className="px-2 py-0.5">
                        <div className="flex items-start gap-1">
                          <span
                            className={`min-w-0 flex-1 break-all whitespace-pre-wrap ${
                              isHidden ? 'text-muted select-none' : ''
                            }`}
                          >
                            {isHidden ? MASK : row.value}
                            {row.note && <span className="text-muted"> {row.note}</span>}
                          </span>
                          {isSensitive && (
                            <button
                              type="button"
                              className="jd-icon-button -my-0.5 size-5"
                              onClick={() => toggle(key)}
                              title={isHidden ? 'Show value' : 'Hide value'}
                              aria-label={`${isHidden ? 'Show' : 'Hide'} value of ${row.name}`}
                            >
                              {isHidden ? (
                                <Eye size={12} aria-hidden />
                              ) : (
                                <EyeOff size={12} aria-hidden />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
