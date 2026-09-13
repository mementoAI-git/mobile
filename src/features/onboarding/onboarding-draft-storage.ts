import { storageKeys } from '@/constants/storage-keys';
import {
  EMPTY_ONBOARDING_DRAFT,
  FIRST_RUN_LIFE_AREAS,
  FIRST_RUN_MOTIVATIONS,
  type FirstRunOnboardingDraft,
} from './first-run-onboarding';
import type { EnrichmentCategory } from '@/constants/enrichment';
import type { OnboardingMotivation } from '@/constants/onboarding';

export interface OnboardingDraftStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

const DRAFT_VERSION = 1;
const validMotivations = new Set<OnboardingMotivation>(
  FIRST_RUN_MOTIVATIONS.map((option) => option.value),
);
const validLifeAreas = new Set<EnrichmentCategory>(
  FIRST_RUN_LIFE_AREAS.map((option) => option.value),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeDraft(value: Record<string, unknown>): FirstRunOnboardingDraft {
  const motivation =
    typeof value.motivation === 'string' && validMotivations.has(value.motivation as OnboardingMotivation)
      ? (value.motivation as OnboardingMotivation)
      : null;
  const lifeAreas = Array.isArray(value.lifeAreas)
    ? value.lifeAreas.filter(
        (area): area is EnrichmentCategory =>
          typeof area === 'string' && validLifeAreas.has(area as EnrichmentCategory),
      )
    : [];
  const step =
    typeof value.step === 'number' && Number.isInteger(value.step) && value.step >= 1 && value.step <= 4
      ? (value.step as FirstRunOnboardingDraft['step'])
      : EMPTY_ONBOARDING_DRAFT.step;

  return {
    preferredName:
      typeof value.preferredName === 'string' ? value.preferredName : EMPTY_ONBOARDING_DRAFT.preferredName,
    motivation,
    about: typeof value.about === 'string' ? value.about : EMPTY_ONBOARDING_DRAFT.about,
    lifeAreas,
    step,
  };
}

export async function readOnboardingDraft(
  storage: OnboardingDraftStorage,
): Promise<FirstRunOnboardingDraft> {
  const raw = await storage.getItem(storageKeys.onboardingState);
  if (!raw) return { ...EMPTY_ONBOARDING_DRAFT, lifeAreas: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== DRAFT_VERSION) {
      return { ...EMPTY_ONBOARDING_DRAFT, lifeAreas: [] };
    }
    return sanitizeDraft(parsed);
  } catch {
    return { ...EMPTY_ONBOARDING_DRAFT, lifeAreas: [] };
  }
}

export async function writeOnboardingDraft(
  storage: OnboardingDraftStorage,
  draft: FirstRunOnboardingDraft,
): Promise<void> {
  const sanitized = sanitizeDraft(draft as unknown as Record<string, unknown>);
  await storage.setItem(
    storageKeys.onboardingState,
    JSON.stringify({ version: DRAFT_VERSION, ...sanitized }),
  );
}

export async function clearOnboardingDraft(storage: OnboardingDraftStorage): Promise<void> {
  await storage.deleteItem(storageKeys.onboardingState);
}
