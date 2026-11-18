import { RECORDER_SCRIPT_FILE, RECORDER_SCRIPT_ID, syncRecorder } from './recording';
import { CHECK_FOR_UPDATE_MESSAGE, isVersionChange, showUpdateBadge } from './updates';

const recorderApis = {
  async getGrantedOrigins() {
    // chrome.scripting only exists once the user has allowed recording somewhere.
    if (!chrome.scripting) return [];
    return (await chrome.permissions.getAll()).origins ?? [];
  },
  async getRegisteredMatches() {
    if (!chrome.scripting) return null;
    const [script] = await chrome.scripting.getRegisteredContentScripts({
      ids: [RECORDER_SCRIPT_ID],
    });
    return script ? (script.matches ?? []) : null;
  },
  register: (matches: string[]) =>
    chrome.scripting.registerContentScripts([
      {
        id: RECORDER_SCRIPT_ID,
        js: [RECORDER_SCRIPT_FILE],
        matches,
        runAt: 'document_start',
        world: 'MAIN',
      },
    ]),
  unregister: () => chrome.scripting.unregisterContentScripts({ ids: [RECORDER_SCRIPT_ID] }),
};

// A failed sync is retried on the next permission change or browser start.
const updateRecorder = () => {
  syncRecorder(recorderApis).catch(() => undefined);
};

chrome.permissions.onAdded.addListener(updateRecorder);
chrome.permissions.onRemoved.addListener(updateRecorder);
chrome.runtime.onStartup.addListener(updateRecorder);

chrome.runtime.onInstalled.addListener((details) => {
  updateRecorder();
  if (isVersionChange(details, chrome.runtime.getManifest().version)) {
    void showUpdateBadge(chrome.action);
  }
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (message !== CHECK_FOR_UPDATE_MESSAGE) return;
  // The browser throttles repeated checks and installs a downloaded update only once DevTools and
  // the popup are closed, so an open panel is never swapped out. A failed check is harmless: the
  // browser still checks on its own schedule.
  chrome.runtime.requestUpdateCheck().catch(() => undefined);
});
