import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import {
  MotivationChoice,
  LifeAreaChoice,
} from '@/components/onboarding/OnboardingChoice';
import {
  FIRST_RUN_MOTIVATIONS,
  FIRST_RUN_LIFE_AREAS,
  type OnboardingStep,
} from '@/features/onboarding/first-run-onboarding';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import * as Haptics from 'expo-haptics';

const INSPIRATION_CHIPS = [
  'Documenting stories for my family...',
  'Reflecting on key life lessons...',
  'Starting a new chapter in my life...',
  'Preserving precious everyday memories...',
];

const STEP_METADATA: Record<
  number,
  { label: string; title: (name: string) => string; subtitle: string }
> = {
  2: {
    label: 'Step 2 of 4 · Motivation',
    title: (name: string) =>
      name ? `Okay, ${name}.\nWhat brings you here?` : 'What brings you\nto Memento?',
    subtitle: 'Choose the primary reason you are creating your personal archive.',
  },
  3: {
    label: 'Step 3 of 4 · About You',
    title: () => 'Tell us a little\nabout yourself',
    subtitle:
      'A few words about where you are in life, what matters most, or what you hope to preserve.',
  },
  4: {
    label: 'Step 4 of 4 · Starting Areas',
    title: () => 'Choose 2 or 3 life areas\nto start with',
    subtitle: 'Pick the areas you want to reflect on first. You can always change this later.',
  },
};

export default function PreferencesScreen() {
  const router = useRouter();
  const {
    draft,
    setMotivation,
    setAbout,
    toggleLifeArea,
    setStep,
    handleSkip,
    isSkipping,
  } = useFirstRunOnboarding();

  const [internalStep, setInternalStep] = useState<2 | 3 | 4>(
    draft.step >= 2 && draft.step <= 4 ? (draft.step as 2 | 3 | 4) : 2,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (draft.step >= 2 && draft.step <= 4 && draft.step !== internalStep) {
      setInternalStep(draft.step as 2 | 3 | 4);
    }
  }, [draft.step, internalStep]);

  const handleBack = () => {
    setErrorMessage(null);
    if (internalStep === 2) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(onboard)/nickname');
      }
    } else if (internalStep === 3) {
      setStep(2);
      setInternalStep(2);
    } else if (internalStep === 4) {
      setStep(3);
      setInternalStep(3);
    }
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (internalStep === 2) {
      if (!draft.motivation) {
        setErrorMessage('Please choose what brings you here.');
        return;
      }
      setStep(3);
      setInternalStep(3);
    } else if (internalStep === 3) {
      const trimmed = draft.about.trim();
      if (!trimmed) {
        setErrorMessage('Tell us a little about yourself.');
        return;
      }
      if (trimmed.length > 500) {
        setErrorMessage('Please keep this to 500 characters or fewer.');
        return;
      }
      setStep(4);
      setInternalStep(4);
    } else if (internalStep === 4) {
      if (draft.lifeAreas.length < 2 || draft.lifeAreas.length > 3) {
        setErrorMessage('Choose two or three areas to start with.');
        return;
      }
      router.push('/(onboard)/summary');
    }
  };

  const handleInspiration = (chipText: string) => {
    Haptics.selectionAsync();
    const current = draft.about.trim();
    if (!current) {
      setAbout(chipText);
    } else if (!current.includes(chipText)) {
      setAbout(`${current} ${chipText}`.slice(0, 500));
    }
  };

  const currentMeta = STEP_METADATA[internalStep];
  const preferredName = draft.preferredName.trim();

  const isNextDisabled =
    internalStep === 2
      ? !draft.motivation
      : internalStep === 3
        ? !draft.about.trim() || draft.about.length > 500
        : draft.lifeAreas.length < 2 || draft.lifeAreas.length > 3;

  const nextButtonLabel = internalStep === 4 ? 'Review Summary' : 'Continue';

  return (
    <OnboardingShell
      step={internalStep}
      totalSteps={4}
      stepLabel={currentMeta.label}
      onBack={handleBack}
      onSkip={handleSkip}
      isSkipping={isSkipping}
      errorMessage={errorMessage}
      primaryAction={{
        label: nextButtonLabel,
        onPress: handleNext,
        disabled: isNextDisabled,
      }}
    >
      <Animated.View
        key={`pref-content-${internalStep}`}
        entering={FadeInRight.duration(280)}
        className="pt-2 pb-6 gap-6"
      >
        {/* Title & Subtitle */}
        <View className="mb-2">
          <Text className="text-text-strong mb-2" style={TYPE.displayTitle}>
            {currentMeta.title(preferredName)}
          </Text>
          <Text className="text-text-base leading-relaxed" style={TYPE.body}>
            {currentMeta.subtitle}
          </Text>
        </View>

        {/* Step 2: Motivation */}
        {internalStep === 2 && (
          <View className="gap-3">
            {FIRST_RUN_MOTIVATIONS.map((opt) => (
              <MotivationChoice
                key={opt.value}
                value={opt.value}
                label={opt.label}
                emoji={opt.emoji}
                selected={draft.motivation === opt.value}
                onSelect={(val) => {
                  setErrorMessage(null);
                  setMotivation(val as any);
                }}
              />
            ))}
          </View>
        )}

        {/* Step 3: About You */}
        {internalStep === 3 && (
          <View className="gap-4">
            <View className="bg-card border border-stroke-weaker rounded-2xl p-4 gap-2">
              <RNTextInput
                value={draft.about}
                onChangeText={(text) => {
                  setErrorMessage(null);
                  setAbout(text);
                }}
                placeholder="Write a few sentences about what brings you here, the memories you want to preserve, or the legacy you want to leave..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                className="text-text-strong p-0 m-0 min-h-[140px]"
                style={TYPE.body}
              />
              <View className="items-end pt-1">
                <Text
                  className={
                    draft.about.length >= 480 ? 'text-warning' : 'text-text-weak'
                  }
                  style={TYPE.metadata}
                >
                  {draft.about.length} / 500
                </Text>
              </View>
            </View>

            {/* Inspiration Chips */}
            <View className="gap-2 mt-2">
              <Text className="text-text-weak" style={TYPE.eyebrow}>
                Need inspiration? Tap to add:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {INSPIRATION_CHIPS.map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    onPress={() => handleInspiration(chip)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={chip}
                    className="px-3 py-1.5 rounded-full bg-fill-weaker border border-stroke-weaker"
                  >
                    <Text className="text-text-base" style={TYPE.label}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Life Areas */}
        {internalStep === 4 && (
          <View className="gap-4">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-text-weak" style={TYPE.label}>
                Select 2 or 3 priority areas
              </Text>
              <Text
                className={
                  draft.lifeAreas.length >= 2 && draft.lifeAreas.length <= 3
                    ? 'text-brand'
                    : 'text-text-weak'
                }
                style={TYPE.eyebrow}
              >
                {draft.lifeAreas.length} of 3 selected
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2.5">
              {FIRST_RUN_LIFE_AREAS.map((opt) => (
                <LifeAreaChoice
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  emoji={opt.emoji}
                  selected={draft.lifeAreas.includes(opt.value)}
                  onToggle={() => {
                    setErrorMessage(null);
                    toggleLifeArea(opt.value);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </Animated.View>
    </OnboardingShell>
  );
}
