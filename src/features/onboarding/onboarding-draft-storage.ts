import { storageKeys } from '@/constants/storage-keys';
import {
  EMPTY_ONBOARDING_DRAFT,
  FIRST_RUN_LIFE_AREAS,
  normalizeMotivations,
  type FirstRunOnboardingDraft,
} from './first-run-onboarding';
import type { EnrichmentCategory } from '@/constants/enrichment';

export interface OnboardingDraftStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

const DRAFT_VERSION = 1;
const validLifeAreas = new Set<EnrichmentCategory>(
  FIRST_RUN_LIFE_AREAS.map((option) => option.value),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeDraft(value: Record<string, unknown>): FirstRunOnboardingDraft {
  // Drafts saved before multi-select hold a single `motivation` string.
  const motivations = normalizeMotivations(Array.isArray(value.motivations) ? value.motivations : [value.motivation]);
  const lifeAreas: EnrichmentCategory[] = [];
  if (Array.isArray(value.lifeAreas)) {
    for (const area of value.lifeAreas) {
      if (
        typeof area === 'string' &&
        validLifeAreas.has(area as EnrichmentCategory) &&
        !lifeAreas.includes(area as EnrichmentCategory)
      ) {
        lifeAreas.push(area as EnrichmentCategory);
      }
      if (lifeAreas.length === 3) break;
    }
  }
  const step =
    typeof value.step === 'number' && Number.isInteger(value.step) && value.step >= 1 && value.step <= 4
      ? (value.step as FirstRunOnboardingDraft['step'])
      : EMPTY_ONBOARDING_DRAFT.step;

  return {
    preferredName:
      typeof value.preferredName === 'string' ? value.preferredName : EMPTY_ONBOARDING_DRAFT.preferredName,
    motivations,
    about:
      typeof value.about === 'string'
        ? value.about.slice(0, 500)
        : EMPTY_ONBOARDING_DRAFT.about,
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
