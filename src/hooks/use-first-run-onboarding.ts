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
        .then((savedDraft) => {
          if (!isMounted) return;
          const currentUser = useAuthStore.getState().user ?? useUserStore.getState().user;
          const initialName =
            savedDraft.preferredName ||
            currentUser?.nickname ||
            currentUser?.first_name ||
            '';

          setDraft(() => ({
            ...savedDraft,
            preferredName: initialName,
          }));
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
      Haptics.selectionAsync();
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return false;
      }
      Haptics.selectionAsync();
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
    try {
      await skipMutation.mutateAsync();
    } catch {
      // Local skip still lets user into app
    }
    resetDraft();
    router.replace('/(tabs)/overview');
  }, [resetDraft, router, skipMutation]);

  const handleComplete = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const payload = buildOnboardingPayload(draft);
    await completeMutation.mutateAsync(payload);
    resetDraft();
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
