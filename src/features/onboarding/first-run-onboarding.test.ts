import { describe, expect, test } from 'bun:test';
import {
  FIRST_RUN_LIFE_AREAS,
  FIRST_RUN_MOTIVATIONS,
  EMPTY_ONBOARDING_DRAFT,
  buildOnboardingPayload,
  buildOnboardingSummary,
  setLifeAreaSelection,
  toggleMotivationSelection,
  normalizeMotivations,
  primaryMotivationType,
  validateOnboardingStep,
} from './first-run-onboarding';

describe('first-run onboarding options', () => {
  test('exposes the six canonical motivation keys', () => {
    expect(FIRST_RUN_MOTIVATIONS.map((motivation) => motivation.value)).toEqual([
      'memory_preservation',
      'self_understanding',
      'life_record',
      'personal_space',
      'emotional_depth',
      'explorer',
    ]);
  });

  test('keeps all canonical life areas in their reference order', () => {
    expect(FIRST_RUN_LIFE_AREAS.map((area) => area.label)).toEqual([
      'Identity & Self',
      'Relationships & People',
      'Work & Purpose',
      'Memories & Experiences',
      'Beliefs & Worldview',
      'Passions & Interests',
      'Heritage & Roots',
      'Lessons & Wisdom',
      'Hopes & Legacy',
      'Everyday Life',
    ]);
  });
});

describe('life-area selection', () => {
  test('accepts a second selected area', () => {
    expect(setLifeAreaSelection(['identity_self'], 'passions_interests')).toEqual({
      values: ['identity_self', 'passions_interests'],
      accepted: true,
    });
  });

  test('accepts a third selected area', () => {
    expect(
      setLifeAreaSelection(
        ['identity_self', 'passions_interests'],
        'relationships_people',
      ),
    ).toEqual({
      values: ['identity_self', 'passions_interests', 'relationships_people'],
      accepted: true,
    });
  });

  test('toggles an existing area off', () => {
    expect(
      setLifeAreaSelection(
        ['identity_self', 'passions_interests'],
        'identity_self',
      ),
    ).toEqual({ values: ['passions_interests'], accepted: true });
  });

  test('rejects a fourth area without changing the selection', () => {
    const current = ['identity_self', 'passions_interests', 'relationships_people'] as const;

    expect(setLifeAreaSelection(current, 'work_purpose')).toEqual({
      values: current,
      accepted: false,
    });
  });
});

describe('onboarding step validation', () => {
  test('accepts a preferred name after trimming whitespace', () => {
    expect(
      validateOnboardingStep(
        { ...EMPTY_ONBOARDING_DRAFT, preferredName: '  Jane  ' },
        1,
      ),
    ).toEqual({ valid: true, message: null });
  });

  test('requires a preferred name', () => {
    expect(validateOnboardingStep(EMPTY_ONBOARDING_DRAFT, 1).valid).toBe(false);
  });

  test('requires at least one motivation', () => {
    expect(validateOnboardingStep(EMPTY_ONBOARDING_DRAFT, 2).valid).toBe(false);
    expect(validateOnboardingStep({ ...EMPTY_ONBOARDING_DRAFT, motivations: ['explorer'] }, 2).valid).toBe(true);
  });

  test('toggles motivations on and off, keeping the option order', () => {
    expect(toggleMotivationSelection([], 'explorer')).toEqual(['explorer']);
    expect(toggleMotivationSelection(['explorer'], 'memory_preservation')).toEqual(['memory_preservation', 'explorer']);
    expect(toggleMotivationSelection(['memory_preservation', 'explorer'], 'explorer')).toEqual(['memory_preservation']);
  });

  test('requires non-empty about text and caps it at 500 characters', () => {
    expect(validateOnboardingStep(EMPTY_ONBOARDING_DRAFT, 3).valid).toBe(false);
    expect(
      validateOnboardingStep(
        { ...EMPTY_ONBOARDING_DRAFT, about: 'a'.repeat(501) },
        3,
      ).valid,
    ).toBe(false);
  });

  test('requires two or three life areas at the final step', () => {
    expect(
      validateOnboardingStep(
        { ...EMPTY_ONBOARDING_DRAFT, lifeAreas: ['identity_self'] },
        4,
      ).valid,
    ).toBe(false);
    expect(
      validateOnboardingStep(
        {
          ...EMPTY_ONBOARDING_DRAFT,
          lifeAreas: ['identity_self', 'passions_interests'],
        },
        4,
      ),
    ).toEqual({ valid: true, message: null });
  });
});

describe('onboarding summary', () => {
  test('builds deterministic summary panels from the draft', () => {
    expect(
      buildOnboardingSummary({
        preferredName: ' Jane ',
        motivations: ['self_understanding'],
        about: ' I care about family and growth. ',
        lifeAreas: ['identity_self', 'passions_interests'],
        step: 4,
      }),
    ).toEqual({
      whyYouAreHere: 'Reflect on my life',
      aboutYou: 'I care about family and growth.',
      startingAreas: ['Identity & Self', 'Passions & Interests'],
    });
  });
});

describe('reason IDs', () => {
  test('match web reasonOptions and read the IDs mobile used before', () => {
    expect(normalizeMotivations(['exploring', 'self_reflection', 'life_record', 'nope', 7, 'self_understanding'])).toEqual([
      'self_understanding',
      'life_record',
      'explorer',
    ]);
  });

  test('a life record counts as memory preservation for the primary motivation, as on web', () => {
    expect(primaryMotivationType(['life_record', 'explorer'])).toBe('memory_preservation');
    expect(primaryMotivationType([])).toBeNull();
  });
});

describe('onboarding compatibility payload with several reasons', () => {
  test('sends every reason and the first as the primary motivation', () => {
    const payload = buildOnboardingPayload({
      ...EMPTY_ONBOARDING_DRAFT,
      motivations: ['self_understanding', 'emotional_depth'],
    });
    expect(payload.join_reasons).toEqual(['self_understanding', 'emotional_depth']);
    expect(payload.motivationType).toBe('self_understanding');
  });

  test('sends no reasons and no primary motivation when none were chosen', () => {
    const payload = buildOnboardingPayload(EMPTY_ONBOARDING_DRAFT);
    expect(payload.join_reasons).toEqual([]);
    expect(payload.motivationType).toBeNull();
  });
});

describe('onboarding compatibility payload', () => {
  test('maps the canonical draft to the completion contract', () => {
    expect(
      buildOnboardingPayload({
        preferredName: ' Jane ',
        motivations: ['self_understanding'],
        about: ' I care about family and growth. ',
        lifeAreas: ['identity_self', 'passions_interests'],
        step: 4,
      }),
    ).toEqual({
      nickname: 'Jane',
      self_description: 'I care about family and growth.',
      join_reasons: ['self_understanding'],
      motivationType: 'self_understanding',
      priorityDimensions: ['identity_self', 'passions_interests'],
      stepReached: 4,
      isComplete: true,
    });
  });
});
