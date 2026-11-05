import './popup.css';
import { takeUpdateBadge } from '../updates';

const DEVTOOLS_SHORTCUT = navigator.userAgent.includes('Mac') ? '⌥⌘I' : 'F12';
const RELEASES_URL = 'https://github.com/eaabak/jsondrill/releases/tag/';

const currentVersion = `v${chrome.runtime.getManifest().version}`;

const shortcut = document.querySelector('[data-shortcut]');
if (shortcut) shortcut.textContent = DEVTOOLS_SHORTCUT;

const version = document.querySelector('[data-version]');
if (version) version.textContent = currentVersion;

void showUpdateNotice();

/** Opening the popup is how the "NEW" badge is acknowledged: point to the release notes once. */
async function showUpdateNotice(): Promise<void> {
  if (!(await takeUpdateBadge(chrome.action))) return;

  const notice = document.querySelector<HTMLElement>('[data-update]');
  const versionLabel = document.querySelector('[data-update-version]');
  const link = document.querySelector<HTMLAnchorElement>('[data-update-link]');
  if (!notice || !versionLabel || !link) return;

  versionLabel.textContent = currentVersion;
  link.href = `${RELEASES_URL}${currentVersion}`;
  notice.hidden = false;
}
