// Update notice shared by the background service worker, the DevTools page and the toolbar popup.

/** Sent by the DevTools page so the service worker asks the browser to look for a newer version. */
export const CHECK_FOR_UPDATE_MESSAGE = 'jsondrill:check-for-update';

export const UPDATE_BADGE_TEXT = 'NEW';

/** The part of `chrome.action` the badge needs, so tests can pass a stand-in. */
export interface BadgeApi {
  getBadgeText(details: chrome.action.TabDetails): Promise<string>;
  setBadgeText(details: chrome.action.BadgeTextDetails): Promise<void>;
  setBadgeBackgroundColor(details: chrome.action.BadgeColorDetails): Promise<void>;
  setBadgeTextColor(details: chrome.action.BadgeColorDetails): Promise<void>;
}

/**
 * True when the browser installed a different version. Reloading an unpacked copy also reports
 * "update", but with an unchanged version, so it does not count.
 */
export function isVersionChange(
  details: chrome.runtime.InstalledDetails,
  currentVersion: string,
): boolean {
  return details.reason === 'update' && details.previousVersion !== currentVersion;
}

export async function showUpdateBadge(action: BadgeApi): Promise<void> {
  await Promise.all([
    action.setBadgeBackgroundColor({ color: '#ffb224' }),
    action.setBadgeTextColor({ color: '#15181e' }),
    action.setBadgeText({ text: UPDATE_BADGE_TEXT }),
  ]);
}

/** Clears the update badge and reports whether it was showing. */
export async function takeUpdateBadge(action: BadgeApi): Promise<boolean> {
  if ((await action.getBadgeText({})) !== UPDATE_BADGE_TEXT) return false;
  await action.setBadgeText({ text: '' });
  return true;
}
