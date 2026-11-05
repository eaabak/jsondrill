// Background service worker: marks the toolbar icon after an update, and lets the DevTools page
// ask the browser to look for a newer version.
import { CHECK_FOR_UPDATE_MESSAGE, isVersionChange, showUpdateBadge } from './updates';

chrome.runtime.onInstalled.addListener((details) => {
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
