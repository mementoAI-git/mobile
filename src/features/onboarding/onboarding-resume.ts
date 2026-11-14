import { create } from 'zustand';
import type { EnrichmentCategory } from '@/constants/enrichment';
import type { OnboardingMotivation } from '@/constants/onboarding';
import type { IUser } from '@/types';
import {
  FIRST_RUN_LIFE_AREAS,
  FIRST_RUN_MOTIVATIONS,
  type FirstRunOnboardingDraft,
} from './first-run-onboarding';

/** True once the account has finished onboarding; skipping does not count. */
export function isOnboardingComplete(
  user: Pick<IUser, 'onboarding_status' | 'onboarded'> | null | undefined,
): boolean {
  return user?.onboarding_status === 'completed' || user?.onboarded === true;
}

/** The answers sent with Skip, so the API can keep them for a later return. */
export interface OnboardingSkipAnswers {
  self_description?: string;
  join_reasons?: string[];
  current_priority?: string[];
  motivationType?: string;
}

export function buildSkipAnswers(draft: FirstRunOnboardingDraft): OnboardingSkipAnswers {
  const about = draft.about.trim();
  return {
    ...(about ? { self_description: about } : {}),
    ...(draft.motivation
      ? { join_reasons: [draft.motivation], motivationType: draft.motivation }
      : {}),
    ...(draft.lifeAreas.length ? { current_priority: [...draft.lifeAreas] } : {}),
  };
}

/** Nothing answered yet on this device (the name is filled from the profile). */
export function hasNoAnswers(draft: FirstRunOnboardingDraft): boolean {
  return !draft.motivation && !draft.about.trim() && draft.lifeAreas.length === 0;
}

export interface SavedOnboardingAnswers {
  join_reasons?: unknown;
  motivation?: unknown;
  self_description?: unknown;
  current_priority?: unknown;
}

const motivations = new Set<string>(FIRST_RUN_MOTIVATIONS.map((option) => option.value));
const lifeAreas = new Set<string>(FIRST_RUN_LIFE_AREAS.map((option) => option.value));

/** Fill a draft from the answers the API kept, starting from the first question. */
export function draftFromSavedAnswers(
  draft: FirstRunOnboardingDraft,
  saved: SavedOnboardingAnswers | null | undefined,
): FirstRunOnboardingDraft {
  if (!saved) return draft;
  const reasons = Array.isArray(saved.join_reasons) ? saved.join_reasons : [];
  const motivation = [...reasons, saved.motivation].find(
    (value): value is OnboardingMotivation => typeof value === 'string' && motivations.has(value),
  );
  const areas = Array.isArray(saved.current_priority)
    ? [...new Set(saved.current_priority.filter(
        (value): value is EnrichmentCategory => typeof value === 'string' && lifeAreas.has(value),
      ))].slice(0, 3)
    : [];
  const about = typeof saved.self_description === 'string' ? saved.self_description.trim().slice(0, 500) : '';
  return {
    ...draft,
    step: 1,
    motivation: motivation ?? draft.motivation,
    about: about || draft.about,
    lifeAreas: areas.length ? areas : draft.lifeAreas,
  };
}

/**
 * Set while someone who skipped has chosen to go back into onboarding, so
 * routing lets them stay there. Without it a skipped account that lands on
 * the onboarding screens (the app's root route) is sent on to the overview.
 */
export const useOnboardingReturn = create<{ active: boolean }>(() => ({ active: false }));

export const ONBOARDING_HREF = '/(onboard)';

export function openOnboarding(router: { push(href: never): void }) {
  useOnboardingReturn.setState({ active: true });
  router.push(ONBOARDING_HREF as never);
}

export function endOnboardingReturn() {
  useOnboardingReturn.setState({ active: false });
}
