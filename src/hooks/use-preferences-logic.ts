import { useState, useRef, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { useUserStore } from '@/store';

export const TOTAL_STEPS = 7;

export interface GrootState {
  ageBand: string | null;
  whereFrom: string;
  mementoFor: string[];
  passions: string[];
  lifeContext: string[];
  motivationType: string | null;
  priorityDimensions: string[];
  expressionMode: string[];
}

export const INITIAL_STATE: GrootState = {
  ageBand: null,
  whereFrom: '',
  mementoFor: [],
  passions: [],
  lifeContext: [],
  motivationType: null,
  priorityDimensions: [],
  expressionMode: [],
};

export const STEP_LABELS: Record<number, string> = {
  1: "A little about you",
  2: "Who this is for",
  3: "What you love",
  4: "Your life right now",
  5: "What brings you here",
  6: "What matters most",
  7: "How you'd like to share",
};

export const ERROR_MESSAGES: Record<number, string> = {
  1: 'Please select your age group.',
  2: 'Please select at least one recipient.',
  3: 'Tell us a bit about what you love.',
  4: 'Choose your current life context.',
  5: 'What brings you to Memento?',
  6: 'Pick at least one area to preserve.',
  7: 'How would you like to share?',
};

export function usePreferencesLogic() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(1);
  const [state, setState] = useState<GrootState>(INITIAL_STATE);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  const nickname = user?.nickname || user?.first_name || 'there';

  const toggle = useCallback(<T extends string>(arr: T[], value: T): T[] => {
    Haptics.selectionAsync();
    return arr.includes(value) ? arr.filter((i) => i !== value) : [...arr, value];
  }, []);

  const canAdvance = useCallback((s: number): boolean => {
    switch (s) {
      case 1: return !!state.ageBand;
      case 2: return state.mementoFor.length >= 1;
      case 3: return state.passions.length >= 1;
      case 4: return state.lifeContext.length >= 1;
      case 5: return !!state.motivationType;
      case 6: return state.priorityDimensions.length >= 1;
      case 7: return state.expressionMode.length >= 1;
      default: return false;
    }
  }, [state]);

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  const handleComplete = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await post(endpoint.completeOnboarding, {
        ...state,
        ageBand: state.ageBand ?? '',
        isComplete: false,
        stepReached: TOTAL_STEPS,
      });
    } catch {
      // Preferences persist is best-effort; the beneficiary step still completes onboarding.
    } finally {
      setSaving(false);
      router.push('/(onboard)/beneficiary');
    }
  };

  const handleNext = () => {
    setValidationAttempted(true);
    if (!canAdvance(step)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setValidationAttempted(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      scrollToTop();
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    setValidationAttempted(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep((s) => s - 1);
      scrollToTop();
    } else {
      // Step 1 of onboarding preferences — go back to nickname or previous onboard step
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(onboard)/nickname');
      }
    }
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    router.push('/(onboard)/beneficiary');
  };

  const updateState = (updater: (prev: GrootState) => Partial<GrootState>) => {
    setState((prev) => ({ ...prev, ...updater(prev) }));
  };

  return {
    router,
    scrollRef,
    step,
    state,
    saving,
    validationAttempted,
    nickname,
    canAdvance,
    handleNext,
    handleBack,
    handleSkip,
    updateState,
    toggle,
  };
}
