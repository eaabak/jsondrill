/** Matches the id the service worker registers the recorder under. */
export const RECORDER_SCRIPT_ID = 'jsondrill-recorder';
export const RECORDER_SCRIPT_FILE = 'recorder.js';

/** The part of the extension APIs the sync needs, so tests can pass a stand-in. */
export interface RecorderApis {
  getGrantedOrigins(): Promise<string[]>;
  getRegisteredMatches(): Promise<string[] | null>;
  register(matches: string[]): Promise<void>;
  unregister(): Promise<void>;
}

/**
 * The site access granted for recording is the list of sites to record, so the registered
 * script follows it whenever the user turns recording on or off, here or in Chrome's settings.
 */
export async function syncRecorder(apis: RecorderApis): Promise<void> {
  const origins = (await apis.getGrantedOrigins()).toSorted();
  const registered = await apis.getRegisteredMatches();
  if (registered !== null && sameList(registered.toSorted(), origins)) return;
  if (registered !== null) await apis.unregister();
  if (origins.length > 0) await apis.register(origins);
}

/**
 * Turns a page address into the pattern Chrome grants site access for, or null for pages
 * that cannot be recorded (chrome://, file:// and the like). Ports are left out because Chrome
 * patterns match every port of a host.
 */
export function getRecordingPattern(pageUrl: string): string | null {
  try {
    const { protocol, hostname } = new URL(pageUrl);
    if ((protocol !== 'https:' && protocol !== 'http:') || hostname === '') return null;
    return `${protocol}//${hostname}/*`;
  } catch {
    return null;
  }
}

/** "example.com" for "https://example.com/*". */
export function getPatternSite(pattern: string): string {
  return pattern.replace(/^[a-z]+:\/\//, '').replace(/\/\*$/, '');
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
