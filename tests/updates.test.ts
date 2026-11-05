import { describe, expect, it } from 'vitest';
import {
  isVersionChange,
  showUpdateBadge,
  takeUpdateBadge,
  UPDATE_BADGE_TEXT,
  type BadgeApi,
} from '../src/updates';

function createBadge(text = '') {
  const state = { text, background: '', color: '' };
  const action: BadgeApi = {
    getBadgeText: async () => state.text,
    setBadgeText: async (details) => {
      state.text = details.text ?? '';
    },
    setBadgeBackgroundColor: async (details) => {
      state.background = String(details.color);
    },
    setBadgeTextColor: async (details) => {
      state.color = String(details.color);
    },
  };
  return { state, action };
}

describe('isVersionChange', () => {
  it('is true when the browser installed a new version', () => {
    expect(isVersionChange({ reason: 'update', previousVersion: '0.2.0' }, '0.2.1')).toBe(true);
  });

  it('ignores reloading an unpacked copy with the same version', () => {
    expect(isVersionChange({ reason: 'update', previousVersion: '0.2.1' }, '0.2.1')).toBe(false);
  });

  it('ignores a first install and browser updates', () => {
    expect(isVersionChange({ reason: 'install' }, '0.2.1')).toBe(false);
    expect(isVersionChange({ reason: 'chrome_update' }, '0.2.1')).toBe(false);
  });
});

describe('update badge', () => {
  it('shows NEW in a colour that stands out', async () => {
    const { state, action } = createBadge();
    await showUpdateBadge(action);
    expect(state.text).toBe(UPDATE_BADGE_TEXT);
    expect(state.background).not.toBe('');
    expect(state.color).not.toBe('');
  });

  it('is cleared once it has been seen', async () => {
    const { state, action } = createBadge(UPDATE_BADGE_TEXT);
    expect(await takeUpdateBadge(action)).toBe(true);
    expect(state.text).toBe('');
    expect(await takeUpdateBadge(action)).toBe(false);
  });

  it('leaves other badge text alone', async () => {
    const { state, action } = createBadge('3');
    expect(await takeUpdateBadge(action)).toBe(false);
    expect(state.text).toBe('3');
  });
});
