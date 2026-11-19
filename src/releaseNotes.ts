export type ReleaseTag = 'feature' | 'improvement' | 'fix';

export interface ReleaseNote {
  version: string;
  /** Release day as YYYY-MM-DD. */
  date: string;
  tags: readonly ReleaseTag[];
  title: string;
  description: string;
}

// Shown in the popup, newest first. Each release needs an entry; CHANGELOG.md has the full list.
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    version: '0.5.0',
    date: '2026-11-18',
    tags: ['feature'],
    title: 'Requests are kept while DevTools is closed',
    description:
      'Click Record when closed under the request list and allow the site once. Its requests are then in the list as soon as you open DevTools. Nothing is sent anywhere or saved to disk.',
  },
  {
    version: '0.5.0',
    date: '2026-11-18',
    tags: ['fix'],
    title: 'One scroll bar in this popup',
    description: 'The list of updates scrolls on its own and the popup no longer scrolls with it.',
  },
  {
    version: '0.4.0',
    date: '2026-11-16',
    tags: ['feature'],
    title: 'Open a JSON file or paste JSON',
    description:
      'Click the JSONDrill icon and choose Open a JSON file or paste JSON. It opens in a tab with the same search, filters and table, no DevTools needed.',
  },
  {
    version: '0.4.0',
    date: '2026-11-16',
    tags: ['feature'],
    title: 'Copy a request as a bug report, cURL or fetch',
    description:
      'Copy as turns any request into a ready-to-paste bug report, a cURL command or a fetch() call. Tokens, cookies and passwords are hidden unless you choose to include them.',
  },
  {
    version: '0.4.0',
    date: '2026-11-16',
    tags: ['improvement'],
    title: 'Requests in the same order as the Network tab',
    description:
      'New requests now appear at the bottom of the list, and the list follows them until you scroll up.',
  },
  {
    version: '0.4.0',
    date: '2026-11-16',
    tags: ['improvement'],
    title: 'Simpler controls, and tokens in cookies',
    description:
      'Search, the list picker and Add filter share one row, and options appear only when they are useful. A JWT stored in a cookie is decoded in the Headers tab.',
  },
  {
    version: '0.3.0',
    date: '2026-11-15',
    tags: ['feature'],
    title: 'Slow and failed requests stand out',
    description:
      'Every request shows how long it took. Slow ones are orange, very slow and failed ones are red. Tick Errors to see only the failures, or sort by Slowest first or Problems first.',
  },
  {
    version: '0.3.0',
    date: '2026-11-15',
    tags: ['feature'],
    title: 'GraphQL errors are no longer hidden',
    description:
      'GraphQL calls show their operation name, and a response that carries errors is marked as failed even when its status is 200.',
  },
  {
    version: '0.3.0',
    date: '2026-11-15',
    tags: ['feature', 'improvement'],
    title: 'Timing, endpoint summary and decoded tokens',
    description:
      'The Headers tab shows where the time went, how the endpoint behaved across all its calls, and the content and expiry of a JWT.',
  },
];

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Stops at `limit` notes, but never in the middle of a release. */
export function getLatestNotes(
  notes: readonly ReleaseNote[] = RELEASE_NOTES,
  limit = 4,
): ReleaseNote[] {
  const latest: ReleaseNote[] = [];
  for (const note of notes) {
    const startsRelease = note.version !== latest.at(-1)?.version;
    if (startsRelease && latest.length >= limit) break;
    latest.push(note);
  }
  return latest;
}

/** "Nov 15" for "2026-11-15". */
export function formatNoteDate(date: string): string {
  return DATE_FORMAT.format(new Date(`${date}T00:00:00Z`));
}
