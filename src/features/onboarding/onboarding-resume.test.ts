import { describe, expect, test } from 'bun:test';
import { EMPTY_ONBOARDING_DRAFT } from './first-run-onboarding';
import {
  buildSkipAnswers,
  draftFromSavedAnswers,
  hasNoAnswers,
  isOnboardingComplete,
} from './onboarding-resume';

const empty = { ...EMPTY_ONBOARDING_DRAFT, lifeAreas: [] };

describe('saving answers on skip', () => {
  test('sends only what has been answered', () => {
    expect(buildSkipAnswers(empty)).toEqual({});
    expect(
      buildSkipAnswers({ ...empty, motivations: ['life_record', 'explorer'], about: '  Me  ', lifeAreas: ['identity_self'], step: 4 }),
    ).toEqual({
      self_description: 'Me',
      join_reasons: ['life_record', 'explorer'],
      motivationType: 'memory_preservation',
      current_priority: ['identity_self'],
    });
  });

  test('a name alone does not count as answers', () => {
    expect(hasNoAnswers({ ...empty, preferredName: 'Ada' })).toBe(true);
    expect(hasNoAnswers({ ...empty, about: 'x' })).toBe(false);
  });
});

describe('returning after a skip', () => {
  test('fills in the saved answers and starts from the first question', () => {
    const draft = draftFromSavedAnswers(
      { ...empty, preferredName: 'Ada', step: 3 },
      {
        join_reasons: ['self_understanding', 'exploring', 'self_reflection'],
        self_description: 'I grew up by the sea.',
        current_priority: ['identity_self', 'unknown', 'work_purpose', 'identity_self'],
      },
    );
    expect(draft).toEqual({
      preferredName: 'Ada',
      step: 1,
      motivations: ['self_understanding', 'explorer'],
      about: 'I grew up by the sea.',
      lifeAreas: ['identity_self', 'work_purpose'],
    });
  });

  test('keeps the empty draft when nothing was saved or the request failed', () => {
    expect(draftFromSavedAnswers(empty, null)).toEqual(empty);
    expect(draftFromSavedAnswers(empty, { join_reasons: 'nope', current_priority: null })).toMatchObject({
      motivations: [],
      about: '',
      lifeAreas: [],
    });
  });

  test('falls back to the single saved motivation when no reasons were kept', () => {
    expect(draftFromSavedAnswers(empty, { join_reasons: [], motivation: 'self_reflection' }).motivations).toEqual(['self_understanding']);
  });

  test('trims a long introduction to the app limit', () => {
    expect(draftFromSavedAnswers(empty, { self_description: 'a'.repeat(900) }).about).toHaveLength(500);
  });
});

test('only a completed onboarding counts as complete', () => {
  expect(isOnboardingComplete({ onboarding_status: 'skipped', onboarded: false } as never)).toBe(false);
  expect(isOnboardingComplete({ onboarding_status: 'completed' } as never)).toBe(true);
  expect(isOnboardingComplete(null)).toBe(false);
});
