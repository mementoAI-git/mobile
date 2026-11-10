// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { PUBLIC_STORY_AUDIENCE, planStoryShare } from './share-story';

describe('sharing a story link', () => {
  test('shares a public story straight away', () => {
    expect(planStoryShare({ visibility: 'everyone', status: 'save' })).toBe('share');
  });

  test('asks before making a private story public', () => {
    expect(planStoryShare({ visibility: 'private', status: 'save' })).toBe('confirm-public');
    // Older stories may have no visibility at all; the API treats them as private.
    expect(planStoryShare({ status: 'save' })).toBe('confirm-public');
  });

  test('asks for stories shared only with chosen people', () => {
    expect(planStoryShare({
      visibility: 'private',
      status: 'save',
      beneficiaries: ['b1'],
    })).toBe('confirm-public');
  });

  test('a draft must be published first: its link never opens for others', () => {
    expect(planStoryShare({ visibility: 'everyone', status: 'draft' })).toBe('publish-first');
    expect(planStoryShare({ visibility: 'private', status: 'draft' })).toBe('publish-first');
  });

  test('cannot share a story it could not load', () => {
    expect(planStoryShare(null)).toBe('unavailable');
    expect(planStoryShare({ visibility: 'everyone', status: 'deleted' })).toBe('unavailable');
  });

  test('making it public clears specific shares, as the API requires', () => {
    expect(PUBLIC_STORY_AUDIENCE).toEqual({ visibility: 'everyone', beneficiaries: [], groups: [] });
  });
});
