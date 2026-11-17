import { describe, expect, mock, test } from 'bun:test';
import type { ApiResponse } from '@/api/interface';
import type { IUser } from '@/types';
import type { OnboardingCompatibilityPayload } from '@/features/onboarding/first-run-onboarding';
import type { OnboardingSessionOwnership } from '@/features/onboarding/onboarding-completion';
import {
  executeFirstRunOnboardingMutation,
  executeSkipFirstRunOnboardingMutation,
  type FirstRunOnboardingMutationDependencies,
} from '@/features/onboarding/first-run-onboarding-mutation';

const payload: OnboardingCompatibilityPayload = {
  nickname: 'Jane',
  self_description: 'I care about family and growth.',
  join_reasons: ['self_understanding'],
  motivationType: 'self_understanding',
  priorityDimensions: ['identity_self', 'passions_interests'],
  stepReached: 4,
  isComplete: true,
};

const completedUser: IUser = {
  _id: 'user-1',
  email: 'jane@memento.test',
  first_name: 'Jane',
  last_name: 'Doe',
  nickname: 'Jane',
  gender: '',
  phone_number: '',
  dob: '',
  country: '',
  password: '',
  onboarded: true,
  onboarding_status: 'completed',
  providers: ['email'],
  preferences: {},
  context: {
    self_description: 'I care about family and growth.',
    current_priority: '',
    join_reasons: ['self_understanding'],
  },
  verified: true,
  private_key: '',
  public_key: '',
  two_factor: { secret: '', enabled: false },
  picture: '',
  last_seen: '2026-09-13T00:00:00.000Z',
  streak: 0,
  newsletter_subscriber: false,
  created_at: '2026-09-13T00:00:00.000Z',
  onboarding_step_reached: 4,
};

const ownership: OnboardingSessionOwnership = {
  accountId: 'user-1',
  sessionId: 'session-1',
};

function acknowledged<T>(data: T): ApiResponse<T> {
  return { data, success: true, status: 200 };
}

function createDependencies(
  overrides: Partial<FirstRunOnboardingMutationDependencies> = {},
): FirstRunOnboardingMutationDependencies {
  return {
    getOwnership: () => ownership,
    putRequest: mock(async () => acknowledged(null)),
    postRequest: mock(async () => acknowledged(null)),
    getProfile: mock(async () => acknowledged(completedUser)),
    setAuthUser: mock(() => undefined),
    setCompatibilityUser: mock(() => undefined),
    clearDraft: mock(async () => undefined),
    ...overrides,
  };
}

describe('first-run onboarding mutation adapter', () => {
  test('rejects a completion acknowledgement marked unsuccessful', async () => {
    const getProfile = mock(async () => acknowledged(completedUser));
    const setAuthUser = mock(() => undefined);
    const dependencies = createDependencies({
      postRequest: mock(async (url) =>
        url.endsWith('/complete-onboarding')
          ? { data: null, success: false, status: 200 }
          : acknowledged(null),
      ),
      getProfile,
      setAuthUser,
    });

    await expect(executeFirstRunOnboardingMutation(payload, dependencies)).rejects.toMatchObject({
      stage: 'completion-acknowledgement',
    });
    expect(getProfile).not.toHaveBeenCalled();
    expect(setAuthUser).not.toHaveBeenCalled();
  });

  test('preserves a profile refresh rejection and avoids local effects', async () => {
    const refreshFailure = new Error('profile unavailable');
    const setAuthUser = mock(() => undefined);
    const clearDraft = mock(async () => undefined);
    const dependencies = createDependencies({
      getProfile: mock(async () => {
        throw refreshFailure;
      }),
      setAuthUser,
      clearDraft,
    });

    await expect(executeFirstRunOnboardingMutation(payload, dependencies)).rejects.toMatchObject({
      stage: 'profile-refresh',
      cause: refreshFailure,
    });
    expect(setAuthUser).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  test('rejects a refreshed user whose onboarding status is nonterminal', async () => {
    const setAuthUser = mock(() => undefined);
    const clearDraft = mock(async () => undefined);
    const nonterminalUser: IUser = {
      ...completedUser,
      onboarded: false,
      onboarding_status: 'never',
    };
    const dependencies = createDependencies({
      getProfile: mock(async () => acknowledged(nonterminalUser)),
      setAuthUser,
      clearDraft,
    });

    await expect(executeFirstRunOnboardingMutation(payload, dependencies)).rejects.toMatchObject({
      stage: 'completed-user',
    });
    expect(setAuthUser).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  test('rejects a skip acknowledgement marked unsuccessful', async () => {
    const getProfile = mock(async () => acknowledged(completedUser));
    const setAuthUser = mock(() => undefined);
    const dependencies = createDependencies({
      postRequest: mock(async () => ({ data: null, success: false, status: 200 })),
      getProfile,
      setAuthUser,
    });

    await expect(executeSkipFirstRunOnboardingMutation(dependencies)).rejects.toMatchObject({
      stage: 'skip-acknowledgement',
    });
    expect(getProfile).not.toHaveBeenCalled();
    expect(setAuthUser).not.toHaveBeenCalled();
  });

  test('stops skip profile refresh when the initiating session changes', async () => {
    let currentOwnership: OnboardingSessionOwnership | null = ownership;
    const getProfile = mock(async () => acknowledged(completedUser));
    const setAuthUser = mock(() => undefined);
    const clearDraft = mock(async () => undefined);
    const dependencies = createDependencies({
      getOwnership: () => currentOwnership,
      postRequest: mock(async () => {
        currentOwnership = null;
        return acknowledged(null);
      }),
      getProfile,
      setAuthUser,
      clearDraft,
    });

    await expect(executeSkipFirstRunOnboardingMutation(dependencies)).rejects.toMatchObject({
      stage: 'ownership',
    });
    expect(getProfile).not.toHaveBeenCalled();
    expect(setAuthUser).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  test('sends the answers given so far with the skip and keeps a typed name', async () => {
    const skippedUser = { ...completedUser, onboarded: false, onboarding_status: 'skipped' as const };
    const postRequest = mock(async () => acknowledged(null));
    const putRequest = mock(async () => acknowledged(null));
    const dependencies = createDependencies({
      postRequest,
      putRequest,
      getProfile: mock(async () => acknowledged(skippedUser)),
    });
    const answers = { self_description: 'About me', join_reasons: ['life_record'], current_priority: ['identity_self'] };

    await executeSkipFirstRunOnboardingMutation(dependencies, answers, ' Ada ');

    expect(putRequest).toHaveBeenCalledWith('/users/profile', { nickname: 'Ada' });
    expect(postRequest).toHaveBeenCalledWith('/users/onboarding/skip', answers);
  });

  test('still skips when saving the typed name fails', async () => {
    const skippedUser = { ...completedUser, onboarded: false, onboarding_status: 'skipped' as const };
    const dependencies = createDependencies({
      putRequest: mock(async () => { throw new Error('offline'); }),
      getProfile: mock(async () => acknowledged(skippedUser)),
    });

    await expect(executeSkipFirstRunOnboardingMutation(dependencies, {}, 'Ada')).resolves.toMatchObject({
      onboarding_status: 'skipped',
    });
  });
});
