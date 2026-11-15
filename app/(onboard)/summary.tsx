import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { OnboardingIcon } from '@/components/onboarding/OnboardingIcon';
import { LIFE_AREA_ICONS } from '@/components/onboarding/onboarding-icons';
import { OnboardingSettingUp } from '@/components/onboarding/OnboardingSettingUp';
import { TYPE } from '@/constants/typography';
import { responsiveSpace } from '@/constants/responsive';
import { COLORS } from '@/constants/tokens';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';

const MOTIVATION_SUMMARY_TEXT: Record<string, string> = {
  self_reflection:
    'To reflect more, remember the important moments, and grow into a better version of myself.',
  preserve_memories:
    'To preserve memories I don’t want to lose and keep them safe for years to come.',
  life_record:
    'To build a rich, enduring record of my life, my milestones, and my everyday journey.',
  organize_thoughts:
    'To organize my thoughts, stories, and files in one meaningful, searchable space.',
  legacy_for_loved_ones:
    'To create something meaningful, lasting, and deeply personal for loved ones.',
  exploring:
    'To explore Memento AI and discover fresh, mindful ways to reflect and remember.',
};

const LIFE_AREA_LABELS: Record<string, string> = {
  identity_self: 'Identity and self',
  everyday_life: 'Everyday life',
  relationships_people: 'Relationships & People',
  work_purpose: 'Work & Purpose',
  memories_experiences: 'Memories & Experiences',
  heritage_roots: 'Heritage & Roots',
  passions_interests: 'Passions & Interests',
  lessons_wisdom: 'Lessons & Wisdoms',
  beliefs_worldview: 'Beliefs & Worldview',
  hopes_legacy: 'Hopes & Legacy',
};

const DEFAULT_ABOUT =
  'You’re curious, thoughtful person who values growth, meaningful relationships and new experiences.';

export default function SummaryScreen() {
  const {
    draft,
    summary,
    handleComplete,
    isCompleting,
    completionError,
  } = useFirstRunOnboarding();

  const preferredName = draft.preferredName.trim();
  const whyYouAreHere =
    (draft.motivation && MOTIVATION_SUMMARY_TEXT[draft.motivation]) ||
    summary.whyYouAreHere ||
    MOTIVATION_SUMMARY_TEXT.self_reflection;

  const aboutYou = draft.about.trim() || DEFAULT_ABOUT;
  const selectedAreas =
    draft.lifeAreas.length > 0
      ? draft.lifeAreas
      : (['identity_self', 'passions_interests', 'lessons_wisdom'] as const);

  // True while the answers are saved; handleComplete then opens Overview.
  const [settingUp, setSettingUp] = useState(false);

  const onStartJourney = async () => {
    setSettingUp(true);
    try {
      await handleComplete();
    } catch {
      setSettingUp(false);
    }
  };

  if (settingUp) return <OnboardingSettingUp name={preferredName} />;

  return (
    <OnboardingShell
      step={4}
      totalSteps={4}
      indicatorVariant="dots"
      errorMessage={
        completionError ? 'Could not complete onboarding. Please try again.' : null
      }
      primaryAction={{
        label: 'Start using Memento AI',
        onPress: onStartJourney,
        loading: isCompleting,
      }}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
        {/* Figma 19761:11496 */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <OnboardingIcon name="beach" />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.titleText}>
          Alright, <Text style={styles.brandItalic}>{preferredName || 'Jane'}</Text>, you’re ready to dive right in.
        </Animated.Text>
        <Text style={styles.subtitleText}>
          We now have a starting point for getting to know you. Memento AI will use what you’ve shared to shape your prompts & conversations.
        </Text>

        <View style={styles.cards}>
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={[styles.card, styles.cardBlue]}>
            <Text style={[styles.panelLabel, { color: COLORS.summaryBlueText }]}>Why you’re here</Text>
            <Text style={styles.monoBody}>{whyYouAreHere}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.card, styles.cardPurple]}>
            <Text style={[styles.panelLabel, { color: COLORS.summaryPurpleLabel }]}>About you</Text>
            <Text style={styles.monoBody}>{aboutYou}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={[styles.card, styles.cardPeach]}>
            <Text style={[styles.panelLabel, { color: COLORS.summaryPeachText }]}>Starting areas</Text>
            <View style={styles.chipsRow}>
              {selectedAreas.map((areaKey) => (
                <View key={areaKey} style={styles.lifeAreaChip}>
                  {LIFE_AREA_ICONS[areaKey] ? <OnboardingIcon name={LIFE_AREA_ICONS[areaKey]} /> : null}
                  <Text style={styles.lifeAreaChipText}>{LIFE_AREA_LABELS[areaKey] ?? areaKey}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.infoRow}>
            <OnboardingIcon name="infoCircle" color={COLORS.textStrong} />
            <Text style={styles.infoText}>You can always edit or build on this later</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  // Figma summary body: icon, title, lead and cards 24px apart; cards 12px apart.
  container: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 24,
  },
  titleText: {
    ...TYPE.onboardingTitle,
    color: COLORS.textStrong,
  },
  brandItalic: {
    ...TYPE.onboardingTitleAccent,
    color: COLORS.brand,
  },
  subtitleText: {
    ...TYPE.bodyLarge,
    color: COLORS.textStrong,
  },
  cards: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: responsiveSpace(16),
    paddingVertical: responsiveSpace(12),
    gap: 8,
  },
  cardBlue: {
    backgroundColor: COLORS.summaryBlueBg,
    borderColor: COLORS.summaryBlueBorder,
  },
  cardPurple: {
    backgroundColor: COLORS.summaryPurpleBg,
    borderColor: COLORS.summaryPurpleBorder,
  },
  cardPeach: {
    backgroundColor: COLORS.summaryPeachBg,
    borderColor: COLORS.summaryPeachBorder,
  },
  panelLabel: {
    ...TYPE.bodySmallStrong,
  },
  monoBody: {
    ...TYPE.mono,
    color: COLORS.textStrong,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lifeAreaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: responsiveSpace(16),
    paddingVertical: 11,
    borderRadius: 9999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
  },
  lifeAreaChipText: {
    ...TYPE.chipLabel,
    color: COLORS.textStrong,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  infoText: {
    ...TYPE.bodySmall,
    color: COLORS.textBase,
  },
});
