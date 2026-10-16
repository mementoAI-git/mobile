import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
} from 'react-native';
import { Pressable } from '@/components/ui/Touchable';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import {
  MotivationChoice,
  LifeAreaChoice,
} from '@/components/onboarding/OnboardingChoice';
import {
  type FirstRunLifeAreaOption,
  type FirstRunMotivationOption,
  type OnboardingMotivation,
} from '@/features/onboarding/first-run-onboarding';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';
import * as Haptics from 'expo-haptics';

const MOTIVATION_DISPLAY_OPTIONS: Array<{
  value: FirstRunMotivationOption['value'];
  label: string;
  emoji: string;
}> = [
  {
    value: 'preserve_memories',
    label: 'Preserve memories i don’t want to lose',
    emoji: '🌴',
  },
  {
    value: 'self_reflection',
    label: 'Reflect and understand myself better',
    emoji: '🤔',
  },
  {
    value: 'life_record',
    label: 'Build a record of my life over time',
    emoji: '📖',
  },
  {
    value: 'organize_thoughts',
    label: 'Organize my thoughts, stories  and files',
    emoji: '📁',
  },
  {
    value: 'legacy_for_loved_ones',
    label: 'Create something meaningful for loved ones',
    emoji: '💕',
  },
  {
    value: 'exploring',
    label: 'Just exploring',
    emoji: '🔮',
  },
];

const INSPIRATION_PILLS = [
  'What you do',
  'People important to you',
  'What you care about',
  'What life is like right now',
  'Something you’re working towards',
];

const LIFE_AREA_DISPLAY_OPTIONS: Array<{
  value: FirstRunLifeAreaOption['value'];
  label: string;
  emoji: string;
}> = [
  { value: 'identity_self', label: 'Identity and self', emoji: '🍥' },
  { value: 'everyday_life', label: 'Everyday life', emoji: '🍧' },
  { value: 'relationships_people', label: 'Relationships & People', emoji: '👥' },
  { value: 'work_purpose', label: 'Work & Purpose', emoji: '💼' },
  { value: 'memories_experiences', label: 'Memories & Experiences', emoji: '🗳️' },
  { value: 'heritage_roots', label: 'Heritage & Roots', emoji: '🏠' },
  { value: 'passions_interests', label: 'Passions & Interests', emoji: '🎮' },
  { value: 'lessons_wisdom', label: 'Lessons & Wisdoms', emoji: '🗝️' },
  { value: 'beliefs_worldview', label: 'Beliefs & Worldview', emoji: '🪴' },
  { value: 'hopes_legacy', label: 'Hopes & Legacy', emoji: '🏺' },
];

function GreenUserIcon({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx="16" cy="9" r="6" fill={COLORS.onboardingUserLime} />
      <Path
        d="M6 27C6 21.4772 10.4772 17 16 17C21.5228 17 26 21.4772 26 27C26 27.5523 25.5523 28 25 28H7C6.44772 28 6 27.5523 6 27Z"
        fill={COLORS.onboardingUserLime}
      />
    </Svg>
  );
}

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

  const handleInspiration = (pill: string) => {
    Haptics.selectionAsync();
    const current = draft.about.trim();
    if (!current) {
      setAbout(pill);
    } else if (!current.includes(pill)) {
      setAbout(`${current}, ${pill}`.slice(0, 500));
    }
  };

  const handleMotivationSelect = useCallback(
    (motivation: OnboardingMotivation) => {
      setErrorMessage(null);
      setMotivation(motivation);
    },
    [setMotivation],
  );

  const handleLifeAreaToggle = useCallback(
    (lifeArea: FirstRunLifeAreaOption['value']) => {
      setErrorMessage(null);
      return toggleLifeArea(lifeArea);
    },
    [toggleLifeArea],
  );

  const preferredName = draft.preferredName.trim();
  const shellStep = internalStep === 2 ? 1 : internalStep === 3 ? 2 : 3;

  const isNextDisabled =
    internalStep === 2
      ? !draft.motivation
      : internalStep === 3
        ? !draft.about.trim() || draft.about.length > 500
        : draft.lifeAreas.length < 2 || draft.lifeAreas.length > 3;

  return (
    <OnboardingShell
      step={shellStep}
      totalSteps={4}
      indicatorVariant="dots"
      onSkip={handleSkip}
      isSkipping={isSkipping}
      skipLabel="Skip →"
      errorMessage={errorMessage}
      secondaryAction={
        internalStep > 2
          ? {
              label: 'Back',
              onPress: handleBack,
              rounded: 'xl',
            }
          : undefined
      }
      primaryAction={{
        label: 'Continue',
        onPress: handleNext,
        disabled: isNextDisabled,
        rounded: 'xl',
      }}
    >
      <Animated.View
        key={`pref-content-${internalStep}`}
        entering={FadeInRight.duration(280)}
        className="pt-2 pb-6"
      >
        {/* Step 2: Motivation */}
        {internalStep === 2 && (
          <View>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.visualContainer}>
              <Text style={TYPE.displayTitle}>📜</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.headingContainer}>
              <Text style={styles.titleText}>
                Okay{' '}
                <Text style={styles.brandItalic}>{preferredName || 'Jane'}</Text>, let’s{'\n'}
                get started
              </Text>
              <Text style={styles.motivationSubtitle}>
                First off, what brings you to Memento AI?
              </Text>
            </Animated.View>

            <View className="gap-3">
              {MOTIVATION_DISPLAY_OPTIONS.map((opt) => (
                <MotivationChoice
                  key={opt.value}
                  label={opt.label}
                  icon={<Text style={TYPE.label}>{opt.emoji}</Text>}
                  selected={draft.motivation === opt.value}
                  onPress={() => handleMotivationSelect(opt.value)}
                  hideRadio
                />
              ))}
            </View>
          </View>
        )}

        {/* Step 3: About You */}
        {internalStep === 3 && (
          <View>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.visualContainer}>
              <GreenUserIcon size={32} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.headingContainer}>
              <Text style={styles.titleText}>
                Tell us a little bit about{'\n'}
                yourself, <Text style={styles.brandItalic}>{preferredName || 'Jane'}</Text>
              </Text>
              <Text style={styles.subtitleText}>
                Share anything you think would help Memento learn about you. Just something to give us a starting point.
              </Text>
            </Animated.View>

            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Enter About info</Text>
              <View style={styles.textAreaContainer}>
                <RNTextInput
                  value={draft.about}
                  onChangeText={(text) => {
                    setErrorMessage(null);
                    setAbout(text);
                  }}
                  placeholder="Eg: I am a software engineer and a father of 2 living in Dubln. I care about family, creativity and personal growth. Lately i’ve been focused on building the things i’m proud of..."
                  placeholderTextColor={COLORS.textWeak}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  style={styles.textAreaInput}
                />
                <View style={styles.charCountContainer}>
                  <Text style={styles.charCountText}>
                    {draft.about.length}/500
                  </Text>
                </View>
              </View>
            </View>

            {/* Inspiration Chips */}
            <View style={styles.inspirationSection}>
              <Text style={styles.inspirationLabel}>Need inspiration?</Text>
              <View style={styles.inspirationChipsRow}>
                {INSPIRATION_PILLS.map((pill) => (
                  <Pressable
                    key={pill}
                    onPress={() => handleInspiration(pill)}
                    accessibilityRole="button"
                    accessibilityLabel={pill}
                    style={styles.inspirationChip}
                  >
                    <Text style={styles.inspirationChipText}>{pill}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Life Areas */}
        {internalStep === 4 && (
          <View>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.visualContainer}>
              <Text style={TYPE.displayTitle}>📁</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.headingContainer}>
              <Text style={styles.titleText}>
                Which parts of your life{'\n'}
                would you like explore first?
              </Text>
              <Text style={styles.subtitleText}>
                Pick 2 to 3 areas. We’ll prioritize prompts and suggestions around these to help you start.
              </Text>
            </Animated.View>

            <View>
              <Text style={styles.lifeAreasHeader}>Life areas</Text>
              <View style={styles.lifeAreasGrid}>
                {LIFE_AREA_DISPLAY_OPTIONS.map((opt) => (
                  <LifeAreaChoice
                    key={opt.value}
                    label={opt.label}
                    icon={<Text style={TYPE.label}>{opt.emoji}</Text>}
                    selected={draft.lifeAreas.includes(opt.value)}
                    onPress={() => handleLifeAreaToggle(opt.value)}
                  />
                ))}
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  visualContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headingContainer: {
    marginBottom: 24,
  },
  titleText: {
    ...TYPE.displayTitle,
    color: COLORS.textStrong,
    marginBottom: 12,
  },
  brandItalic: {
    color: COLORS.brand,
    fontStyle: 'italic',
  },
  motivationSubtitle: {
    ...TYPE.bodyStrong,
    color: COLORS.textStrong,
  },
  subtitleText: {
    ...TYPE.body,
    color: COLORS.textStrong,
    lineHeight: 22,
  },
  fieldSection: {
    gap: 8,
  },
  fieldLabel: {
    ...TYPE.bodyStrong,
    color: COLORS.textStrong,
  },
  textAreaContainer: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    borderRadius: radius(16),
    padding: responsiveSpace(16),
    minHeight: 180,
    justifyContent: 'space-between',
  },
  textAreaInput: {
    ...TYPE.body,
    color: COLORS.textStrong,
    padding: 0,
    margin: 0,
    minHeight: 130,
    textAlignVertical: 'top',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  charCountText: {
    ...TYPE.metadata,
    color: COLORS.textWeak,
  },
  inspirationSection: {
    marginTop: 20,
    gap: 12,
  },
  inspirationLabel: {
    ...TYPE.body,
    color: COLORS.textWeak,
  },
  inspirationChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inspirationChip: {
    paddingHorizontal: responsiveSpace(16),
    paddingVertical: responsiveSpace(10),
    minHeight: minTouchTarget(40),
    borderRadius: 9999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    justifyContent: 'center',
  },
  inspirationChipText: {
    ...TYPE.bodySmall,
    color: COLORS.textStrong,
  },
  lifeAreasHeader: {
    ...TYPE.body,
    color: COLORS.textWeak,
    marginBottom: 12,
  },
  lifeAreasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
