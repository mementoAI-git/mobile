// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  getAutosaveStatusBadge,
  getStoryDraftStorageKey,
  isMeaningfulDraftContent,
} from './autosave';
import { COLORS } from '@/constants/tokens';

describe('editor autosave helpers', () => {
  test('returns badge metadata matching tokens for each status', () => {
    const saved = getAutosaveStatusBadge('saved');
    expect(saved.label).toBe('Saved');
    expect(saved.dotColor).toBe(COLORS.success);

    const saving = getAutosaveStatusBadge('saving');
    expect(saving.label).toBe('Saving…');
    expect(saving.dotColor).toBe(COLORS.warning);

    const unsaved = getAutosaveStatusBadge('unsaved');
    expect(unsaved.label).toBe('Unsaved');
    expect(unsaved.dotColor).toBe(COLORS.error);
  });

  test('derives stable storage key with safe user id fallbacks', () => {
    expect(getStoryDraftStorageKey('usr_123')).toBe('@memento_story_draft_usr_123');
    expect(getStoryDraftStorageKey(null)).toBe('@memento_story_draft_anonymous');
    expect(getStoryDraftStorageKey('')).toBe('@memento_story_draft_anonymous');
  });

  test('correctly identifies whether draft content is meaningful', () => {
    expect(isMeaningfulDraftContent('Title', '')).toBe(true);
    expect(isMeaningfulDraftContent('', '<p>Hello world</p>')).toBe(true);
    expect(isMeaningfulDraftContent('', '<p><br></p>')).toBe(false);
    expect(isMeaningfulDraftContent('   ', '   ')).toBe(false);
  });
});
