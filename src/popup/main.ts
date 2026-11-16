import './popup.css';
import { formatNoteDate, getLatestNotes } from '../releaseNotes';
import { takeUpdateBadge } from '../updates';

const DEVTOOLS_SHORTCUT = navigator.userAgent.includes('Mac') ? '⌥⌘I' : 'F12';
const RELEASES_URL = 'https://github.com/eaabak/jsondrill/releases';

const currentVersion = `v${chrome.runtime.getManifest().version}`;

const shortcut = document.querySelector('[data-shortcut]');
if (shortcut) shortcut.textContent = DEVTOOLS_SHORTCUT;

const version = document.querySelector('[data-version]');
if (version) version.textContent = currentVersion;

const guide = document.querySelector<HTMLElement>('[data-guide]');
const updates = document.querySelector<HTMLElement>('[data-updates]');
const openButton = document.querySelector<HTMLElement>('[data-updates-open]');

renderUpdates();
document.querySelector('[data-updates-close]')?.addEventListener('click', () => showUpdates(false));
openButton?.addEventListener('click', () => showUpdates(true));
void showUpdatesAfterUpgrade();

/** Opening the popup is how the "NEW" badge is acknowledged: show what changed once. */
async function showUpdatesAfterUpgrade(): Promise<void> {
  if (await takeUpdateBadge(chrome.action)) showUpdates(true);
}

function showUpdates(visible: boolean): void {
  if (!guide || !updates || !openButton) return;
  updates.hidden = !visible;
  guide.hidden = visible;
  openButton.hidden = visible;
}

function renderUpdates(): void {
  const list = document.querySelector('[data-updates-list]');
  const more = document.querySelector<HTMLAnchorElement>('[data-updates-more]');
  if (!list || !more) return;
  more.href = RELEASES_URL;

  for (const note of getLatestNotes()) {
    const tags = element('div', 'tags');
    if (`v${note.version}` === currentVersion) tags.append(element('span', 'tag tag-new', 'New'));
    for (const tag of note.tags) tags.append(element('span', `tag tag-${tag}`, tag));
    tags.append(element('span', 'muted', `${formatNoteDate(note.date)} · v${note.version}`));

    const item = element('li', 'note-item');
    item.append(tags, element('h3', '', note.title), element('p', 'muted', note.description));
    list.append(item);
  }
}

function element(tagName: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tagName);
  if (className !== '') node.className = className;
  node.textContent = text;
  return node;
}
