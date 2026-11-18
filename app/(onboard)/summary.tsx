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
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';

const MOTIVATION_SUMMARY_TEXT: Record<string, string> = {
  self_understanding:
    'To reflect more, remember the important moments, and grow into a better version of myself.',
  memory_preservation:
    'To preserve memories I don’t want to lose and keep them safe for years to come.',
  life_record:
    'To build a rich, enduring record of my life, my milestones, and my everyday journey.',
  personal_space:
    'To organize my thoughts, stories, and files in one meaningful, searchable space.',
  emotional_depth:
    'To create something meaningful, lasting, and deeply personal for loved ones.',
  explorer:
    'To explore Memento AI and discover fresh, mindful ways to reflect and remember.',
};

// Short phrases joined when several reasons are chosen, matching web summary.tsx.
const MOTIVATION_SUMMARY_PHRASE: Record<string, string> = {
  memory_preservation: 'preserve memories I don’t want to lose',
  self_understanding: 'reflect and understand myself better',
  life_record: 'build a record of my life over time',
  personal_space: 'organize my thoughts, stories and files',
  emotional_depth: 'create something meaningful for loved ones',
  explorer: 'explore Memento and discover what feels right for me',
};

function motivationSummary(motivations: readonly string[]): string | null {
  if (motivations.length === 0) return null;
  if (motivations.length === 1) return MOTIVATION_SUMMARY_TEXT[motivations[0]] ?? null;
  const phrases = motivations.map((value) => MOTIVATION_SUMMARY_PHRASE[value]).filter(Boolean);
  return phrases.length ? `To ${phrases.join(', and ')}.` : null;
}

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
  const styles = useThemeStyles(createStyles);
  const {
    draft,
    summary,
    handleComplete,
    isCompleting,
    completionError,
  } = useFirstRunOnboarding();
  const colors = useThemeColors();

  const preferredName = draft.preferredName.trim();
  const whyYouAreHere =
    motivationSummary(draft.motivations) ||
    summary.whyYouAreHere ||
    MOTIVATION_SUMMARY_TEXT.self_understanding;

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
            <Text style={[styles.panelLabel, { color: colors.summaryBlueText }]}>Why you’re here</Text>
            <Text style={styles.monoBody}>{whyYouAreHere}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={[styles.card, styles.cardPurple]}>
            <Text style={[styles.panelLabel, { color: colors.summaryPurpleLabel }]}>About you</Text>
            <Text style={styles.monoBody}>{aboutYou}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={[styles.card, styles.cardPeach]}>
            <Text style={[styles.panelLabel, { color: colors.summaryPeachText }]}>Starting areas</Text>
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
            <OnboardingIcon name="infoCircle" color={colors.textStrong} />
            <Text style={styles.infoText}>You can always edit or build on this later</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </OnboardingShell>
  );
}

const createStyles = (c: typeof COLORS) => StyleSheet.create({
  // Figma summary body: icon, title, lead and cards 24px apart; cards 12px apart.
  container: {
    paddingTop: 8,
    paddingBottom: 24,
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
  subtitleText: {
    ...TYPE.bodyLarge,
    color: c.textStrong,
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
    backgroundColor: c.summaryBlueBg,
    borderColor: c.summaryBlueBorder,
  },
  cardPurple: {
    backgroundColor: c.summaryPurpleBg,
    borderColor: c.summaryPurpleBorder,
  },
  cardPeach: {
    backgroundColor: c.summaryPeachBg,
    borderColor: c.summaryPeachBorder,
  },
  panelLabel: {
    ...TYPE.bodySmallStrong,
  },
  monoBody: {
    ...TYPE.mono,
    color: c.textStrong,
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
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.strokeWeak,
  },
  lifeAreaChipText: {
    ...TYPE.chipLabel,
    color: c.textStrong,
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
    color: c.textBase,
  },
});
