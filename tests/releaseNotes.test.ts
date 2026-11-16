import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import {
  formatNoteDate,
  getLatestNotes,
  RELEASE_NOTES,
  type ReleaseNote,
} from '../src/releaseNotes';

const note = (version: string): ReleaseNote => ({
  version,
  date: '2026-01-01',
  tags: ['feature'],
  title: version,
  description: '',
});

describe('release notes', () => {
  it('describe the current version, so the popup has something new to show', () => {
    expect(RELEASE_NOTES.some(({ version }) => version === packageJson.version)).toBe(true);
  });

  it('are complete and listed newest first', () => {
    for (const { date, tags, title, description } of RELEASE_NOTES) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(date))).toBe(false);
      expect(tags.length).toBeGreaterThan(0);
      expect(title).not.toBe('');
      expect(description).not.toBe('');
    }
    const dates = RELEASE_NOTES.map(({ date }) => date);
    expect(dates).toEqual(dates.toSorted().toReversed());
  });
});

describe('getLatestNotes', () => {
  it('keeps the newest releases whole', () => {
    const notes = ['3', '3', '3', '2', '2', '1'].map(note);
    expect(getLatestNotes(notes, 4).map(({ version }) => version)).toEqual([
      '3',
      '3',
      '3',
      '2',
      '2',
    ]);
    expect(getLatestNotes(notes, 3).map(({ version }) => version)).toEqual(['3', '3', '3']);
    expect(getLatestNotes(notes, 1).map(({ version }) => version)).toEqual(['3', '3', '3']);
    expect(getLatestNotes([], 4)).toEqual([]);
  });
});

describe('formatNoteDate', () => {
  it('shows the month and the day', () => {
    expect(formatNoteDate('2026-11-15')).toBe('Nov 15');
    expect(formatNoteDate('2026-01-01')).toBe('Jan 1');
  });
});
