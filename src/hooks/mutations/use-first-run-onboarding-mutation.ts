import { useMutation } from '@tanstack/react-query';
import endpoint from '@/api/endpoint';
import { get, post, put } from '@/api/mutations';
import type { OnboardingCompatibilityPayload } from '@/features/onboarding/first-run-onboarding';
import {
  executeFirstRunOnboardingMutation,
  executeSkipFirstRunOnboardingMutation,
  getOnboardingSessionOwnership,
  type FirstRunOnboardingMutationDependencies,
} from '@/features/onboarding/first-run-onboarding-mutation';
import { clearOnboardingDraft } from '@/features/onboarding/onboarding-draft-storage';
import { secureStorage } from '@/lib/secure-storage';
import { useAuthStore, useUserStore } from '@/store';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import type { OnboardingSkipAnswers } from '@/features/onboarding/onboarding-resume';

function createDependencies(): FirstRunOnboardingMutationDependencies {
  return {
    getOwnership: () => getOnboardingSessionOwnership(useAuthStore.getState()),
    putRequest: (url, payload) => put(url, payload),
    postRequest: (url, payload) => post(url, payload),
    getProfile: () => get(endpoint.profile),
    setAuthUser: (user) => {
      useAuthStore.getState().updateUser(user);
      // Screens read the cached profile too; keep it from showing the old status.
      queryClient.setQueryData(queryKeys.profile, user);
    },
    setCompatibilityUser: (user) => useUserStore.getState().setUser(user),
    clearDraft: () => clearOnboardingDraft(secureStorage),
  };
}

export function useCompleteFirstRunOnboarding() {
  return useMutation({
    mutationFn: (draft: OnboardingCompatibilityPayload) =>
      executeFirstRunOnboardingMutation(draft, createDependencies()),
  });
}

export function useSkipFirstRunOnboarding() {
  return useMutation({
    mutationFn: ({ answers, nickname }: { answers: OnboardingSkipAnswers; nickname?: string }) =>
      executeSkipFirstRunOnboardingMutation(createDependencies(), answers, nickname),
  });
}
