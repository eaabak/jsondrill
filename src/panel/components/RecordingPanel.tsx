import { Check } from 'lucide-react';

interface RecordingPanelProps {
  id: string;
  site: string;
  isOn: boolean;
  onStart: () => void;
  onStop: () => void;
  onClose: () => void;
}

export function RecordingPanel({ id, site, isOn, onStart, onStop, onClose }: RecordingPanelProps) {
  const promises = [
    'Nothing is sent anywhere and nothing is saved to disk.',
    'Requests stay in the open page and are cleared when you close or reload it.',
    isOn
      ? 'To stop, click Stop recording, or remove the site access in Chrome.'
      : `Chrome will ask you to allow access to ${site} only.`,
  ];
  return (
    <section
      id={id}
      aria-label="Record when closed"
      className="shrink-0 border-t border-line bg-surface-alt px-2 py-1.5"
    >
      <h3 className="m-0 mb-1 text-xs font-semibold">
        {isOn ? `Recording ${site}` : 'Record requests while DevTools is closed'}
      </h3>
      <p className="m-0 mb-1">
        {isOn
          ? `The fetch and XHR requests of ${site} are kept while DevTools is closed, from the next page load on, and shown here when you open it.`
          : `JSONDrill keeps the fetch and XHR requests of ${site} while DevTools is closed, so they are here when you open it.`}
      </p>
      <ul className="m-0 mb-1.5 list-none p-0">
        {promises.map((text) => (
          <li key={text} className="flex items-start gap-1.5 py-px">
            <Check size={12} aria-hidden className="mt-px shrink-0 text-success" />
            <span className="min-w-0">{text}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        {isOn ? (
          <button type="button" className="jd-button" onClick={onStop}>
            Stop recording
          </button>
        ) : (
          <button type="button" className="jd-button" onClick={onStart}>
            Start recording
          </button>
        )}
        <button type="button" className="jd-button" onClick={onClose}>
          {isOn ? 'Close' : 'Cancel'}
        </button>
      </div>
    </section>
  );
}
