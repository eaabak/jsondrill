import './popup.css';

const DEVTOOLS_SHORTCUT = navigator.userAgent.includes('Mac') ? '⌥⌘I' : 'F12';

const shortcut = document.querySelector('[data-shortcut]');
if (shortcut) shortcut.textContent = DEVTOOLS_SHORTCUT;

const version = document.querySelector('[data-version]');
if (version) version.textContent = `v${chrome.runtime.getManifest().version}`;
