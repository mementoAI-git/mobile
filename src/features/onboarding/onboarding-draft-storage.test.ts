import { describe, expect, test } from 'bun:test';
import {
  EMPTY_ONBOARDING_DRAFT,
  type FirstRunOnboardingDraft,
} from './first-run-onboarding';
import {
  clearOnboardingDraft,
  readOnboardingDraft,
  writeOnboardingDraft,
} from './onboarding-draft-storage';
import { storageKeys } from '@/constants/storage-keys';

type MemoryStorage = {
  values: Record<string, string>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
};

function createStorage(initial: Record<string, string> = {}): MemoryStorage {
  const values = { ...initial };
  return {
    values,
    async getItem(key) {
      return values[key] ?? null;
    },
    async setItem(key, value) {
      values[key] = value;
    },
    async deleteItem(key) {
      delete values[key];
    },
  };
}

const completeDraft: FirstRunOnboardingDraft = {
  preferredName: 'Jane',
  motivations: ['self_understanding', 'explorer'],
  about: 'I care about family and growth.',
  lifeAreas: ['identity_self', 'passions_interests'],
  step: 4,
};

describe('onboarding draft storage', () => {
  test('returns the empty draft when no draft is stored', async () => {
    expect(await readOnboardingDraft(createStorage())).toEqual(EMPTY_ONBOARDING_DRAFT);
  });

  test('reads a valid version 1 draft', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({ version: 1, ...completeDraft }),
    });

    expect(await readOnboardingDraft(storage)).toEqual(completeDraft);
  });

  test('recovers from malformed JSON', async () => {
    const storage = createStorage({ [storageKeys.onboardingState]: '{broken' });

    expect(await readOnboardingDraft(storage)).toEqual(EMPTY_ONBOARDING_DRAFT);
  });

  test('recovers from an unsupported draft version', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({ version: 2, ...completeDraft }),
    });

    expect(await readOnboardingDraft(storage)).toEqual(EMPTY_ONBOARDING_DRAFT);
  });

  test('resets an invalid saved step while preserving valid fields', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({
        version: 1,
        preferredName: 'Jane',
        motivation: 'self_reflection',
        about: 'About Jane',
        lifeAreas: ['identity_self', 'passions_interests'],
        step: 9,
      }),
    });

    expect(await readOnboardingDraft(storage)).toEqual({
      ...EMPTY_ONBOARDING_DRAFT,
      preferredName: 'Jane',
      motivations: ['self_understanding'],
      about: 'About Jane',
      lifeAreas: ['identity_self', 'passions_interests'],
    });
  });

  test('drops invalid saved categories while preserving valid categories', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({
        version: 1,
        ...completeDraft,
        lifeAreas: ['identity_self', 'not-a-category', 42],
      }),
    });

    expect(await readOnboardingDraft(storage)).toEqual({
      ...completeDraft,
      lifeAreas: ['identity_self'],
    });
  });

  test('recovers invalid scalar fields to their empty defaults', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({
        version: 1,
        preferredName: 42,
        motivation: 'not-a-motivation',
        about: null,
        lifeAreas: ['identity_self', 'passions_interests'],
        step: 2,
      }),
    });

    expect(await readOnboardingDraft(storage)).toEqual({
      ...EMPTY_ONBOARDING_DRAFT,
      lifeAreas: ['identity_self', 'passions_interests'],
      step: 2,
    });
  });

  test('recovers missing preferred name and about fields to empty strings', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({
        version: 1,
        motivation: 'self_reflection',
        lifeAreas: ['identity_self', 'passions_interests'],
        step: 2,
      }),
    });

    expect(await readOnboardingDraft(storage)).toEqual({
      ...EMPTY_ONBOARDING_DRAFT,
      motivations: ['self_understanding'],
      lifeAreas: ['identity_self', 'passions_interests'],
      step: 2,
    });
  });

  test('maps old mobile IDs, drops unknown motivations and restores list order', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({
        version: 1,
        ...completeDraft,
        motivations: ['exploring', 'nope', 'self_reflection', 'exploring', 3],
      }),
    });

    expect((await readOnboardingDraft(storage)).motivations).toEqual(['self_understanding', 'explorer']);
  });

  test('deduplicates and caps saved life areas at three canonical values', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({
        version: 1,
        ...completeDraft,
        lifeAreas: [
          'identity_self',
          'identity_self',
          'passions_interests',
          'work_purpose',
          'memories_experiences',
        ],
      }),
    });

    expect(await readOnboardingDraft(storage)).toEqual({
      ...completeDraft,
      lifeAreas: ['identity_self', 'passions_interests', 'work_purpose'],
    });
  });

  test('caps an overlong saved about response at 500 characters', async () => {
    const storage = createStorage({
      [storageKeys.onboardingState]: JSON.stringify({
        version: 1,
        ...completeDraft,
        about: 'a'.repeat(501),
      }),
    });

    expect(await readOnboardingDraft(storage)).toEqual({
      ...completeDraft,
      about: 'a'.repeat(500),
    });
  });

  test('writes a versioned draft under the onboarding state key', async () => {
    const storage = createStorage();

    await writeOnboardingDraft(storage, completeDraft);

    expect(JSON.parse(storage.values[storageKeys.onboardingState])).toEqual({
      version: 1,
      ...completeDraft,
    });
  });

  test('clearing removes the stored draft', async () => {
    const storage = createStorage();
    await writeOnboardingDraft(storage, completeDraft);

    await clearOnboardingDraft(storage);

    expect(storage.values[storageKeys.onboardingState]).toBeUndefined();
  });
});
