import { useMutation } from '@tanstack/react-query';
import endpoint from '@/api/endpoint';
import { get, post, put } from '@/api/mutations';
import type { OnboardingCompatibilityPayload } from '@/features/onboarding/first-run-onboarding';
import {
  completeFirstRunOnboarding,
  OnboardingCompletionError,
} from '@/features/onboarding/onboarding-completion';
import { clearOnboardingDraft } from '@/features/onboarding/onboarding-draft-storage';
import { secureStorage } from '@/lib/secure-storage';
import { useAuthStore, useUserStore } from '@/store';
import type { IUser } from '@/types';

export type SkipFirstRunOnboardingStage =
  | 'skip'
  | 'completed-user'
  | 'auth-store'
  | 'compatibility-store'
  | 'draft';

async function readServerUser(): Promise<IUser | null> {
  const response = await get<IUser>(endpoint.profile);
  return response.data ?? null;
}

export function useCompleteFirstRunOnboarding() {
  return useMutation({
    mutationFn: (draft: OnboardingCompatibilityPayload) =>
      completeFirstRunOnboarding(draft, {
        writeProfile: async (payload) => {
          await put(endpoint.profile, payload);
        },
        writePersona: async (payload) => {
          await put(endpoint.persona, payload);
        },
        writeOnboarding: async (payload) => {
          await post(endpoint.onboarding, payload);
        },
        completeOnboarding: async (payload) => {
          await post(endpoint.completeOnboarding, payload);
          return readServerUser();
        },
        setAuthUser: (user) => useAuthStore.getState().updateUser(user),
        setCompatibilityUser: (user) => useUserStore.getState().setUser(user),
        clearDraft: () => clearOnboardingDraft(secureStorage),
      }),
  });
}

async function atSkipStage<T>(
  stage: SkipFirstRunOnboardingStage,
  operation: () => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    throw new OnboardingCompletionError(stage, cause);
  }
}

async function skipFirstRunOnboarding(): Promise<IUser> {
  await atSkipStage('skip', () => post(endpoint.onboardingSkip, {}));
  const user = await atSkipStage('completed-user', readServerUser);
  if (
    !user ||
    (user.onboarding_status !== 'skipped' && user.onboarding_status !== 'completed')
  ) {
    throw new OnboardingCompletionError(
      'completed-user',
      new Error('The server did not return a skipped or completed user.'),
    );
  }

  await atSkipStage('auth-store', () => useAuthStore.getState().updateUser(user));
  await atSkipStage('compatibility-store', () =>
    useUserStore.getState().setUser(user),
  );
  await atSkipStage('draft', () => clearOnboardingDraft(secureStorage));
  return user;
}

export function useSkipFirstRunOnboarding() {
  return useMutation({ mutationFn: skipFirstRunOnboarding });
}
