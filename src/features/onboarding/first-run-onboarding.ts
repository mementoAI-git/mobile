import type { EnrichmentCategory } from '@/constants/enrichment';
import {
  FIRST_RUN_LIFE_AREAS,
  FIRST_RUN_MOTIVATIONS,
} from '@/constants/onboarding';
import type { OnboardingMotivation } from '@/constants/onboarding';

export { FIRST_RUN_LIFE_AREAS, FIRST_RUN_MOTIVATIONS };
export type {
  FirstRunLifeAreaOption,
  FirstRunMotivationOption,
  OnboardingMotivation,
} from '@/constants/onboarding';

export type OnboardingStep = 1 | 2 | 3 | 4;

export interface FirstRunOnboardingDraft {
  preferredName: string;
  motivation: OnboardingMotivation | null;
  about: string;
  lifeAreas: EnrichmentCategory[];
  step: OnboardingStep;
}

export interface SelectionResult {
  values: readonly EnrichmentCategory[];
  accepted: boolean;
}

export interface StepValidation {
  valid: boolean;
  message: string | null;
}

export interface OnboardingSummary {
  whyYouAreHere: string;
  aboutYou: string;
  startingAreas: string[];
}

export interface OnboardingCompatibilityPayload {
  nickname: string;
  self_description: string;
  join_reasons: OnboardingMotivation[];
  motivationType: OnboardingMotivation | null;
  priorityDimensions: EnrichmentCategory[];
  stepReached: 4;
  isComplete: true;
}

export const EMPTY_ONBOARDING_DRAFT: FirstRunOnboardingDraft = {
  preferredName: '',
  motivation: null,
  about: '',
  lifeAreas: [],
  step: 1,
};

export function setLifeAreaSelection(
  current: readonly EnrichmentCategory[],
  next: EnrichmentCategory,
): SelectionResult {
  if (current.includes(next)) {
    return { values: current.filter((value) => value !== next), accepted: true };
  }

  if (current.length >= 3) {
    return { values: [...current], accepted: false };
  }

  return { values: [...current, next], accepted: true };
}

export function validateOnboardingStep(
  draft: FirstRunOnboardingDraft,
  step: OnboardingStep,
): StepValidation {
  switch (step) {
    case 1:
      return draft.preferredName.trim()
        ? { valid: true, message: null }
        : { valid: false, message: 'Please share the name you’d like us to use.' };
    case 2:
      return draft.motivation
        ? { valid: true, message: null }
        : { valid: false, message: 'Please choose what brings you here.' };
    case 3: {
      const about = draft.about.trim();
      if (!about) return { valid: false, message: 'Tell us a little about yourself.' };
      return about.length <= 500
        ? { valid: true, message: null }
        : { valid: false, message: 'Please keep this to 500 characters or fewer.' };
    }
    case 4:
      return draft.lifeAreas.length >= 2 && draft.lifeAreas.length <= 3
        ? { valid: true, message: null }
        : { valid: false, message: 'Choose two or three areas to start with.' };
  }
}

export function buildOnboardingSummary(
  draft: FirstRunOnboardingDraft,
): OnboardingSummary {
  const motivation = FIRST_RUN_MOTIVATIONS.find(
    (option) => option.value === draft.motivation,
  );
  const labelsByArea = new Map(
    FIRST_RUN_LIFE_AREAS.map((area) => [area.value, area.label]),
  );

  return {
    whyYouAreHere: motivation?.label ?? '',
    aboutYou: draft.about.trim(),
    startingAreas: draft.lifeAreas.map((area) => labelsByArea.get(area) ?? area),
  };
}

export function buildOnboardingPayload(
  draft: FirstRunOnboardingDraft,
): OnboardingCompatibilityPayload {
  return {
    nickname: draft.preferredName.trim(),
    self_description: draft.about.trim(),
    join_reasons: draft.motivation ? [draft.motivation] : [],
    motivationType: draft.motivation,
    priorityDimensions: [...draft.lifeAreas],
    stepReached: 4,
    isComplete: true,
  };
}
