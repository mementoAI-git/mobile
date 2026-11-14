import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { secureStorage } from '@/lib/secure-storage';
import {
  EMPTY_ONBOARDING_DRAFT,
  FirstRunOnboardingDraft,
  OnboardingStep,
  setLifeAreaSelection,
  validateOnboardingStep,
  buildOnboardingPayload,
  buildOnboardingSummary,
} from '@/features/onboarding/first-run-onboarding';
import {
  readOnboardingDraft,
  writeOnboardingDraft,
  clearOnboardingDraft,
} from '@/features/onboarding/onboarding-draft-storage';
import {
  useCompleteFirstRunOnboarding,
  useSkipFirstRunOnboarding,
} from '@/hooks/mutations/use-first-run-onboarding-mutation';
import type { EnrichmentCategory } from '@/constants/enrichment';
import type { OnboardingMotivation } from '@/constants/onboarding';
import { useAuthStore, useUserStore } from '@/store';
import { persistSessionUser } from '@/features/auth/session-credentials';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import {
  buildSkipAnswers,
  draftFromSavedAnswers,
  endOnboardingReturn,
  hasNoAnswers,
  type SavedOnboardingAnswers,
} from '@/features/onboarding/onboarding-resume';

interface OnboardingStoreState {
  draft: FirstRunOnboardingDraft;
  isHydrated: boolean;
  setDraft: (updater: (prev: FirstRunOnboardingDraft) => FirstRunOnboardingDraft) => void;
  setHydrated: (hydrated: boolean) => void;
  resetDraft: () => void;
}

export const useOnboardingStore = create<OnboardingStoreState>((set) => ({
  draft: { ...EMPTY_ONBOARDING_DRAFT, lifeAreas: [] },
  isHydrated: false,
  setDraft: (updater) =>
    set((state) => ({ draft: updater(state.draft) })),
  setHydrated: (isHydrated) => set({ isHydrated }),
  resetDraft: () =>
    set({ draft: { ...EMPTY_ONBOARDING_DRAFT, lifeAreas: [] }, isHydrated: false }),
}));

export function useFirstRunOnboarding() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const isHydrated = useOnboardingStore((s) => s.isHydrated);
  const setDraft = useOnboardingStore((s) => s.setDraft);
  const setHydrated = useOnboardingStore((s) => s.setHydrated);
  const resetDraft = useOnboardingStore((s) => s.resetDraft);

  const completeMutation = useCompleteFirstRunOnboarding();
  const skipMutation = useSkipFirstRunOnboarding();

  // Hydrate draft from secure storage on first mount
  useEffect(() => {
    let isMounted = true;
    if (!isHydrated) {
      readOnboardingDraft(secureStorage)
        .then(async (savedDraft) => {
          if (!isMounted) return;
          const currentUser = useAuthStore.getState().user ?? useUserStore.getState().user;
          const initialName =
            savedDraft.preferredName ||
            currentUser?.nickname ||
            currentUser?.first_name ||
            '';
          const draft = { ...savedDraft, preferredName: initialName };

          // Back after skipping, with nothing on this device: start from the
          // beginning with the answers the API kept when they skipped.
          if (currentUser?.onboarding_status === 'skipped' && hasNoAnswers(draft)) {
            const saved = await get<{ persona?: SavedOnboardingAnswers }>(endpoint.onboardingDetails)
              .then((response) => response.data?.persona ?? null)
              .catch(() => null);
            if (!isMounted) return;
            setDraft(() => draftFromSavedAnswers(draft, saved));
          } else {
            setDraft(() => draft);
          }
          setHydrated(true);
        })
        .catch(() => {
          if (!isMounted) return;
          setHydrated(true);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isHydrated, setDraft, setHydrated]);

  // Persist draft to storage whenever it updates
  const persistDraft = useCallback(
    async (nextDraft: FirstRunOnboardingDraft) => {
      try {
        await writeOnboardingDraft(secureStorage, nextDraft);
      } catch {
        // non-blocking
      }
    },
    [],
  );

  const setPreferredName = useCallback(
    (preferredName: string) => {
      setDraft((prev) => {
        const next = { ...prev, preferredName };
        persistDraft(next);
        return next;
      });
    },
    [persistDraft, setDraft],
  );

  const setMotivation = useCallback(
    (motivation: OnboardingMotivation) => {
      setDraft((prev) => {
        const next = { ...prev, motivation };
        persistDraft(next);
        return next;
      });
    },
    [persistDraft, setDraft],
  );

  const setAbout = useCallback(
    (about: string) => {
      setDraft((prev) => {
        const next = { ...prev, about: about.slice(0, 500) };
        persistDraft(next);
        return next;
      });
    },
    [persistDraft, setDraft],
  );

  const toggleLifeArea = useCallback(
    (category: EnrichmentCategory): boolean => {
      const result = setLifeAreaSelection(draft.lifeAreas, category);
      if (!result.accepted) {
        return false;
      }
      setDraft((prev) => {
        const next = { ...prev, lifeAreas: [...result.values] };
        persistDraft(next);
        return next;
      });
      return true;
    },
    [draft.lifeAreas, persistDraft, setDraft],
  );

  const setStep = useCallback(
    (step: OnboardingStep) => {
      setDraft((prev) => {
        const next = { ...prev, step };
        persistDraft(next);
        return next;
      });
    },
    [persistDraft, setDraft],
  );

  const validateCurrentStep = useCallback(
    (step: OnboardingStep) => {
      return validateOnboardingStep(draft, step);
    },
    [draft],
  );

  const handleSkip = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentUser = useAuthStore.getState().user ?? useUserStore.getState().user;
    const { draft: currentDraft } = useOnboardingStore.getState();
    const answers = buildSkipAnswers(currentDraft);
    const typedName = currentDraft.preferredName.trim();
    const nickname = typedName && typedName !== currentUser?.nickname ? typedName : undefined;
    if (currentUser) {
      const skippedUser = { ...currentUser, onboarding_status: 'skipped' as const };
      useAuthStore.getState().updateUser(skippedUser);
      useUserStore.getState().setUser(skippedUser);
      void persistSessionUser(skippedUser, secureStorage);
    }
    try {
      await skipMutation.mutateAsync({ answers, nickname });
    } catch {
      // Local skip still lets user into app
    }
    resetDraft();
    endOnboardingReturn();
    router.replace('/(tabs)/overview');
  }, [resetDraft, router, skipMutation]);

  const handleComplete = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const payload = buildOnboardingPayload(draft);
    await completeMutation.mutateAsync(payload);
    resetDraft();
    endOnboardingReturn();
    router.replace('/(tabs)/overview');
  }, [completeMutation, draft, resetDraft, router]);

  const summary = buildOnboardingSummary(draft);

  return {
    draft,
    summary,
    isHydrated,
    setPreferredName,
    setMotivation,
    setAbout,
    toggleLifeArea,
    setStep,
    validateCurrentStep,
    handleSkip,
    isSkipping: skipMutation.isPending,
    handleComplete,
    isCompleting: completeMutation.isPending,
    completionError: completeMutation.error,
  };
}
