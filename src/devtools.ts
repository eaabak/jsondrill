import { CHECK_FOR_UPDATE_MESSAGE } from './updates';

chrome.devtools.panels.create('JSONDrill', 'icons/icon-16.png', 'panel.html');

// Opening DevTools is when a newer version matters, so check now instead of waiting for the
// browser's own check, which runs only every few hours.
chrome.runtime.sendMessage(CHECK_FOR_UPDATE_MESSAGE).catch(() => undefined);
