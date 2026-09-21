import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Info, Check, ShieldCheck } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { TYPE } from '@/constants/typography';
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

const LIFE_AREA_META: Record<string, { label: string; emoji: string }> = {
  identity_self: { label: 'Identity and self', emoji: '🍥' },
  everyday_life: { label: 'Everyday life', emoji: '🍧' },
  relationships_people: { label: 'Relationships & People', emoji: '👥' },
  work_purpose: { label: 'Work & Purpose', emoji: '💼' },
  memories_experiences: { label: 'Memories & Experiences', emoji: '🗳️' },
  heritage_roots: { label: 'Heritage & Roots', emoji: '🏠' },
  passions_interests: { label: 'Passions & Interests', emoji: '🎮' },
  lessons_wisdom: { label: 'Lessons & Wisdoms', emoji: '🗝️' },
  beliefs_worldview: { label: 'Beliefs & Worldview', emoji: '🪴' },
  hopes_legacy: { label: 'Hopes & Legacy', emoji: '🏺' },
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

  const [vaultStage, setVaultStage] = useState<number | null>(null);

  const onStartJourney = async () => {
    try {
      setVaultStage(1);
      setTimeout(() => setVaultStage(2), 600);
      setTimeout(() => setVaultStage(3), 1200);
      await handleComplete();
    } catch {
      setVaultStage(null);
    }
  };

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
        loading: isCompleting || vaultStage !== null,
        rounded: 'xl',
      }}
    >
      {vaultStage !== null && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(254, 251, 248, 0.98)',
              zIndex: 100,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 24,
            },
          ]}
        >
          <Animated.View entering={FadeInDown.duration(350)} style={{ width: '100%', alignItems: 'center' }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: COLORS.brandTint,
                borderWidth: 1,
                borderColor: 'rgba(233,130,70,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <ShieldCheck size={42} color={COLORS.brand} />
            </View>
            <Text style={[TYPE.sectionTitle, { textAlign: 'center', color: COLORS.textStrong, marginBottom: 8 }]}>
              Forging Your Personal Vault
            </Text>
            <Text style={[TYPE.body, { textAlign: 'center', color: COLORS.textWeak, marginBottom: 32 }]}>
              Preparing your private archive, {preferredName || 'friend'}...
            </Text>

            <View
              style={{
                width: '100%',
                backgroundColor: COLORS.fillWeaker,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: COLORS.strokeWeaker,
                padding: 20,
                gap: 16,
              }}
            >
              {[
                { label: 'Personal encryption keys set', minStage: 1 },
                { label: 'Life dimensions calibrated', minStage: 2 },
                { label: 'AI memory companion ready', minStage: 3 },
              ].map((item, idx) => {
                const done = vaultStage >= item.minStage;
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: done ? 'rgba(6, 122, 87, 0.15)' : COLORS.fillWeak,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {done ? (
                        <Check size={14} color={COLORS.success} strokeWidth={2.5} />
                      ) : (
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textWeak }} />
                      )}
                    </View>
                    <Text
                      style={[
                        TYPE.label,
                        { color: done ? COLORS.textStrong : COLORS.textWeak },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      )}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
        {/* Visual: Beach umbrella */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.visualContainer}>
          <Text style={TYPE.displayTitle}>🏖️</Text>
        </Animated.View>

        {/* Heading */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.headingContainer}>
          <Text style={styles.titleText}>
            Alright,{' '}
            <Text style={styles.brandItalic}>{preferredName || 'Jane'}</Text>, you’re ready{'\n'}
            to dive right in.
          </Text>
          <Text style={styles.subtitleText}>
            We now have a starting point for getting to know you. Memento AI will use what you’ve shared to shape your prompts & conversations.
          </Text>
        </Animated.View>

        {/* Card 1: Why you're here */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.cardBlue}>
          <Text style={styles.panelLabelBlue}>Why you’re here</Text>
          <Text style={styles.monoBody}>{whyYouAreHere}</Text>
        </Animated.View>

        {/* Card 2: About you */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.cardPurple}>
          <Text style={styles.panelLabelPurple}>About you</Text>
          <Text style={styles.monoBody}>{aboutYou}</Text>
        </Animated.View>

        {/* Card 3: Starting areas */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.cardPeach}>
          <Text style={styles.panelLabelPeach}>Starting areas</Text>
          <View style={styles.chipsRow}>
            {selectedAreas.map((areaKey) => {
              const meta = LIFE_AREA_META[areaKey] || { label: areaKey, emoji: '✨' };
              return (
                <View key={areaKey} style={styles.lifeAreaChip}>
                  <Text style={TYPE.label}>{meta.emoji}</Text>
                  <Text style={styles.lifeAreaChipText}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Info row */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.infoRow}>
          <Info size={16} color={COLORS.textWeak} />
          <Text style={styles.infoText}>
            You can always edit or build on this later
          </Text>
        </Animated.View>
      </Animated.View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  visualContainer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  headingContainer: {
    marginBottom: 8,
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
  subtitleText: {
    ...TYPE.body,
    color: COLORS.textStrong,
    lineHeight: 22,
  },
  cardBlue: {
    backgroundColor: COLORS.summaryBlueBg,
    borderColor: COLORS.summaryBlueBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardPurple: {
    backgroundColor: COLORS.summaryPurpleBg,
    borderColor: COLORS.summaryPurpleBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardPeach: {
    backgroundColor: COLORS.summaryPeachBg,
    borderColor: COLORS.summaryPeachBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  panelLabelBlue: {
    ...TYPE.bodyStrong,
    color: COLORS.summaryBlueText,
    marginBottom: 8,
  },
  panelLabelPurple: {
    ...TYPE.bodyStrong,
    color: COLORS.summaryPurpleText,
    marginBottom: 8,
  },
  panelLabelPeach: {
    ...TYPE.bodyStrong,
    color: COLORS.summaryPeachText,
    marginBottom: 12,
  },
  monoBody: {
    ...TYPE.mono,
    color: COLORS.textStrong,
    lineHeight: 20,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
  },
  lifeAreaChipText: {
    ...TYPE.buttonSmall,
    color: COLORS.textStrong,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  infoText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
  },
});
