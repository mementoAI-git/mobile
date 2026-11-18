import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeInDown } from 'react-native-reanimated';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { OnboardingIcon } from '@/components/onboarding/OnboardingIcon';
import type { OnboardingIconName } from '@/components/onboarding/onboarding-icons';
import { ABOUT_LIMIT, OnboardingAboutField } from '@/components/onboarding/OnboardingAboutField';
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
import { useThemeStyles } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';
import { responsiveSpace } from '@/constants/responsive';

const MOTIVATION_DISPLAY_OPTIONS: Array<{
  value: FirstRunMotivationOption['value'];
  label: string;
  icon: OnboardingIconName;
}> = [
  {
    value: 'memory_preservation',
    label: 'Preserve memories I don’t want to lose',
    icon: 'palmTree',
  },
  {
    value: 'self_understanding',
    label: 'Reflect and understand myself better',
    icon: 'thinkingFace',
  },
  {
    value: 'life_record',
    label: 'Build a record of my life over time',
    icon: 'openBook',
  },
  {
    value: 'personal_space',
    label: 'Organize my thoughts, stories  and files',
    icon: 'openFileFolder',
  },
  {
    value: 'emotional_depth',
    label: 'Create something meaningful for loved ones',
    icon: 'twoHearts',
  },
  {
    value: 'explorer',
    label: 'Just exploring',
    icon: 'crystalBall',
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
  icon: OnboardingIconName;
}> = [
  { value: 'identity_self', label: 'Identity and self', icon: 'areaIdentity' },
  { value: 'everyday_life', label: 'Everyday life', icon: 'areaEveryday' },
  { value: 'relationships_people', label: 'Relationships & People', icon: 'areaRelationships' },
  { value: 'work_purpose', label: 'Work & Purpose', icon: 'areaWork' },
  { value: 'memories_experiences', label: 'Memories & Experiences', icon: 'areaMemories' },
  { value: 'heritage_roots', label: 'Heritage & Roots', icon: 'areaHeritage' },
  { value: 'passions_interests', label: 'Passions & Interests', icon: 'areaPassions' },
  { value: 'lessons_wisdom', label: 'Lessons & Wisdoms', icon: 'areaLessons' },
  { value: 'beliefs_worldview', label: 'Beliefs & Worldview', icon: 'areaBeliefs' },
  { value: 'hopes_legacy', label: 'Hopes & Legacy', icon: 'areaHopes' },
];


export default function PreferencesScreen() {
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const {
    draft,
    toggleMotivation,
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
  // True while the About box is recording or transcribing; Continue waits for the transcript.
  const [aboutBusy, setAboutBusy] = useState(false);
  const handleAboutChange = useCallback((text: string) => {
    setErrorMessage(null);
    setAbout(text);
  }, [setAbout]);

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
      if (draft.motivations.length === 0) {
        setErrorMessage('Please choose what brings you here.');
        return;
      }
      setStep(3);
      setInternalStep(3);
    } else if (internalStep === 3) {
      if (aboutBusy) return;
      const trimmed = draft.about.trim();
      if (!trimmed) {
        setErrorMessage('Tell us a little about yourself.');
        return;
      }
      if (trimmed.length > ABOUT_LIMIT) {
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



  const handleMotivationToggle = useCallback(
    (motivation: OnboardingMotivation) => {
      setErrorMessage(null);
      toggleMotivation(motivation);
    },
    [toggleMotivation],
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
      ? draft.motivations.length === 0
      : internalStep === 3
        ? aboutBusy || !draft.about.trim() || draft.about.length > ABOUT_LIMIT
        : draft.lifeAreas.length < 2 || draft.lifeAreas.length > 3;

  return (
    <OnboardingShell
      step={shellStep}
      totalSteps={4}
      indicatorVariant="dots"
      onSkip={handleSkip}
      isSkipping={isSkipping}
      errorMessage={errorMessage}
      secondaryAction={
        internalStep > 2
          ? {
              label: 'Back',
              onPress: handleBack,
              disabled: aboutBusy,
            }
          : undefined
      }
      primaryAction={{
        label: 'Continue',
        onPress: handleNext,
        disabled: isNextDisabled,
      }}
    >
      <Animated.View
        key={`pref-content-${internalStep}`}
        entering={FadeInRight.duration(280)}
        className="pt-2 pb-6"
      >
        {/* Step 2: Motivation (Figma 19761:10773) */}
        {internalStep === 2 && (
          <View style={styles.stack}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <OnboardingIcon name="scroll" />
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.titleText}>
              Okay <Text style={styles.brandItalic}>{preferredName || 'Jane'}</Text>, let’s get started
            </Animated.Text>
            <Text style={styles.leadStrong}>First off, what brings you to Memento AI?</Text>
            <Text style={styles.hint}>Choose all that apply.</Text>

            <View style={styles.optionList}>
              {MOTIVATION_DISPLAY_OPTIONS.map((opt) => (
                <MotivationChoice
                  key={opt.value}
                  label={opt.label}
                  icon={<OnboardingIcon name={opt.icon} />}
                  selected={draft.motivations.includes(opt.value)}
                  onPress={() => handleMotivationToggle(opt.value)}
                  multiple
                />
              ))}
            </View>
          </View>
        )}

        {/* Step 3: About (Figma 19761:10969) */}
        {internalStep === 3 && (
          <View style={styles.stack}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <OnboardingIcon name="user" />
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.titleText}>
              Tell us a little bit about yourself, <Text style={styles.brandItalic}>{preferredName || 'Jane'}</Text>
            </Animated.Text>
            <Text style={styles.lead}>
              Share anything you think would help Memento learn about you. Just something to give us a starting point.
            </Text>

            <View style={styles.aboutGroup}>
              <OnboardingAboutField
                value={draft.about}
                onChange={handleAboutChange}
                onBusyChange={setAboutBusy}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.groupLabel}>Need inspiration?</Text>
                {/* Ideas only, not buttons: plain muted text with dot separators. */}
                <Text style={styles.inspirationText} accessibilityLabel={`Ideas: ${INSPIRATION_PILLS.join(', ')}`}>
                  {INSPIRATION_PILLS.join('  ·  ')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Life areas (Figma 19761:11122 / 11309) */}
        {internalStep === 4 && (
          <View style={styles.stack}>
            <Animated.View entering={FadeInDown.duration(400)}>
              <OnboardingIcon name="folder" />
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.titleText}>
              Which parts of your life would you like explore first?
            </Animated.Text>
            <Text style={styles.lead}>
              Pick 2 to 3 areas. We’ll prioritize prompts and suggestions around these to help you start.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.groupLabel}>Life areas</Text>
              <View style={styles.chipsRow}>
                {LIFE_AREA_DISPLAY_OPTIONS.map((opt) => (
                  <LifeAreaChoice
                    key={opt.value}
                    label={opt.label}
                    icon={<OnboardingIcon name={opt.icon} />}
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

const createStyles = (c: typeof COLORS) => StyleSheet.create({
  // Figma onboarding body: icon, title, lead and content 24px apart.
  stack: {
    gap: 24,
  },
  titleText: {
    ...TYPE.onboardingTitle,
    color: c.textStrong,
  },
  brandItalic: {
    ...TYPE.onboardingTitleAccent,
    color: c.brand,
  },
  lead: {
    ...TYPE.bodyLarge,
    color: c.textStrong,
  },
  leadStrong: {
    ...TYPE.bodyLargeSemi,
    color: c.textStrong,
  },
  // Sits right under the question, pulled up into the 24px stack gap.
  hint: {
    ...TYPE.bodySmall,
    color: c.textWeak,
    marginTop: -20,
  },
  optionList: {
    gap: 10,
  },
  aboutGroup: {
    gap: 24,
  },
  fieldGroup: {
    gap: 6,
  },
  groupLabel: {
    ...TYPE.label,
    color: c.textWeak,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  inspirationText: {
    ...TYPE.bodySmall,
    color: c.textBase,
  },
});
