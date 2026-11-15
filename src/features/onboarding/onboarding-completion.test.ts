import { describe, expect, mock, test } from 'bun:test';
import type { IUser } from '@/types';
import type { OnboardingCompatibilityPayload } from './first-run-onboarding';
import {
  completeFirstRunOnboarding,
  OnboardingCompletionError,
  type OnboardingCompletionDependencies,
  type OnboardingSessionOwnership,
} from './onboarding-completion';

const payload: OnboardingCompatibilityPayload = {
  nickname: 'Jane',
  self_description: 'I care about family and growth.',
  join_reasons: ['self_reflection'],
  motivationType: 'self_reflection',
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
    join_reasons: ['self_reflection'],
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

function createDependencies(
  overrides: Partial<OnboardingCompletionDependencies> = {},
): OnboardingCompletionDependencies {
  return {
    getOwnership: mock(() => ownership),
    writeProfile: mock(async () => undefined),
    writePersona: mock(async () => undefined),
    writeOnboarding: mock(async () => undefined),
    completeOnboarding: mock(async () => completedUser),
    setAuthUser: mock(() => undefined),
    setCompatibilityUser: mock(() => undefined),
    clearDraft: mock(async () => undefined),
    ...overrides,
  };
}

describe('first-run onboarding completion transaction', () => {
  test('writes profile, persona, onboarding answers, and completion in order', async () => {
    const calls: string[] = [];
    const dependencies = createDependencies({
      writeProfile: mock(async (value) => {
        calls.push('profile');
        expect(value).toEqual({ nickname: 'Jane' });
      }),
      writePersona: mock(async (value) => {
        calls.push('persona');
        expect(value).toEqual({
          self_description: 'I care about family and growth.',
          join_reasons: ['self_reflection'],
        });
      }),
      writeOnboarding: mock(async (value) => {
        calls.push('onboarding');
        expect(value).toEqual({
          motivation: 'self_reflection',
          current_priority: ['identity_self', 'passions_interests'],
          priority_dimensions: ['identity_self', 'passions_interests'],
          step: 4,
        });
      }),
      completeOnboarding: mock(async (value) => {
        calls.push('completion');
        expect(value).toEqual({
          self_description: 'I care about family and growth.',
          join_reasons: ['self_reflection'],
          current_priority: ['identity_self', 'passions_interests'],
          motivationType: 'self_reflection',
          stepReached: 4,
        });
        return completedUser;
      }),
    });

    await completeFirstRunOnboarding(payload, dependencies);

    expect(calls).toEqual(['profile', 'persona', 'onboarding', 'completion']);
  });

  test('a write failure prevents completion and preserves stores and draft', async () => {
    const writeFailure = new Error('onboarding write failed');
    const completeOnboarding = mock(async () => completedUser);
    const setAuthUser = mock(() => undefined);
    const setCompatibilityUser = mock(() => undefined);
    const clearDraft = mock(async () => undefined);
    const dependencies = createDependencies({
      writeOnboarding: mock(async () => {
        throw writeFailure;
      }),
      completeOnboarding,
      setAuthUser,
      setCompatibilityUser,
      clearDraft,
    });

    try {
      await completeFirstRunOnboarding(payload, dependencies);
      throw new Error('expected completion to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(OnboardingCompletionError);
      expect(error).toMatchObject({ stage: 'onboarding', cause: writeFailure });
    }

    expect(completeOnboarding).not.toHaveBeenCalled();
    expect(setAuthUser).not.toHaveBeenCalled();
    expect(setCompatibilityUser).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  test('requires a server-confirmed completed user before local side effects', async () => {
    const setAuthUser = mock(() => undefined);
    const setCompatibilityUser = mock(() => undefined);
    const clearDraft = mock(async () => undefined);
    const dependencies = createDependencies({
      completeOnboarding: mock(async () => null),
      setAuthUser,
      setCompatibilityUser,
      clearDraft,
    });

    await expect(completeFirstRunOnboarding(payload, dependencies)).rejects.toMatchObject({
      stage: 'completed-user',
    });

    expect(setAuthUser).not.toHaveBeenCalled();
    expect(setCompatibilityUser).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  test('rejects a returned user whose completion is not server-confirmed', async () => {
    const setAuthUser = mock(() => undefined);
    const setCompatibilityUser = mock(() => undefined);
    const clearDraft = mock(async () => undefined);
    const incompleteUser: IUser = {
      ...completedUser,
      onboarded: false,
      onboarding_status: 'never',
    };
    const dependencies = createDependencies({
      completeOnboarding: mock(async () => incompleteUser),
      setAuthUser,
      setCompatibilityUser,
      clearDraft,
    });

    await expect(completeFirstRunOnboarding(payload, dependencies)).rejects.toMatchObject({
      stage: 'completed-user',
    });
    expect(setAuthUser).not.toHaveBeenCalled();
    expect(setCompatibilityUser).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  test('updates both stores with the returned completed user before clearing the draft', async () => {
    const sideEffects: string[] = [];
    const dependencies = createDependencies({
      setAuthUser: mock((user) => {
        sideEffects.push('auth-store');
        expect(user).toBe(completedUser);
      }),
      setCompatibilityUser: mock((user) => {
        sideEffects.push('compatibility-store');
        expect(user).toBe(completedUser);
      }),
      clearDraft: mock(async () => {
        sideEffects.push('clear-draft');
      }),
    });

    const result = await completeFirstRunOnboarding(payload, dependencies);

    expect(result).toBe(completedUser);
    expect(sideEffects).toEqual(['auth-store', 'compatibility-store', 'clear-draft']);
  });

  test('stops before the next network write when the initiating session logs out', async () => {
    let currentOwnership: OnboardingSessionOwnership | null = ownership;
    // Profile and persona are sent together; the writes after them must not run.
    const writePersona = mock(async () => undefined);
    const writeOnboarding = mock(async () => undefined);
    const completeOnboarding = mock(async () => completedUser);
    const setAuthUser = mock(() => undefined);
    const clearDraft = mock(async () => undefined);
    const dependencies = createDependencies({
      getOwnership: () => currentOwnership,
      writeProfile: async () => {
        currentOwnership = null;
      },
      writePersona,
      writeOnboarding,
      completeOnboarding,
      setAuthUser,
      clearDraft,
    });

    await expect(completeFirstRunOnboarding(payload, dependencies)).rejects.toMatchObject({
      stage: 'ownership',
    });

    expect(writeOnboarding).not.toHaveBeenCalled();
    expect(completeOnboarding).not.toHaveBeenCalled();
    expect(setAuthUser).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  test('does not update local state when the account switches after completion', async () => {
    let currentOwnership: OnboardingSessionOwnership | null = ownership;
    const setAuthUser = mock(() => undefined);
    const setCompatibilityUser = mock(() => undefined);
    const clearDraft = mock(async () => undefined);
    const dependencies = createDependencies({
      getOwnership: () => currentOwnership,
      completeOnboarding: async () => {
        currentOwnership = { accountId: 'user-2', sessionId: 'session-2' };
        return completedUser;
      },
      setAuthUser,
      setCompatibilityUser,
      clearDraft,
    });

    await expect(completeFirstRunOnboarding(payload, dependencies)).rejects.toMatchObject({
      stage: 'ownership',
    });

    expect(setAuthUser).not.toHaveBeenCalled();
    expect(setCompatibilityUser).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });
});
