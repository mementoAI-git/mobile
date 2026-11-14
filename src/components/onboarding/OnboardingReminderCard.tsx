import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import X from 'lucide-react-native/icons/x';
import { TouchableOpacity } from '@/components/ui/Touchable';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { isOnboardingComplete, openOnboarding } from '@/features/onboarding/onboarding-resume';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { useUserStore } from '@/store';
import { create } from 'zustand';

/**
 * A standing prompt in Settings to finish onboarding. It has no dismiss
 * button; it only goes away once onboarding is completed. Mirrors web
 * `OnboardingReminderCard`.
 */
export function OnboardingReminderCard() {
  const user = useUserStore((s) => s.user);
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  if (!user || isOnboardingComplete(user)) return null;
  const open = () => {
    void Haptics.selectionAsync();
    openOnboarding(router);
  };
  return (
    <View style={styles.card} accessibilityLabel="Finish onboarding">
      <Text style={styles.title}>Finish setting up Memento</Text>
      <Text style={styles.body}>
        Tell Memento a little about yourself so your prompts and conversations fit you. It only takes a few minutes.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Complete onboarding"
        onPress={open}
        activeOpacity={0.8}
        style={styles.action}
      >
        <Text style={styles.actionText}>Complete onboarding</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * The overview's nudge for people who skipped onboarding. Dismissing it only
 * hides it until the app next opens; Settings and Insights keep the way back.
 */
export function OnboardingNudgeBanner() {
  const user = useUserStore((s) => s.user);
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const dismissed = useNudgeDismissed((s) => s.dismissed);
  if (!user || dismissed || user.onboarding_status !== 'skipped' || isOnboardingComplete(user)) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Finish setting up your Memento — it only takes a few minutes.</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Continue setup"
        onPress={() => openOnboarding(router)}
        hitSlop={8}
      >
        <Text style={styles.bannerAction}>Continue setup</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={() => useNudgeDismissed.setState({ dismissed: true })}
        hitSlop={10}
      >
        <X size={16} color={colors.textWeak} />
      </TouchableOpacity>
    </View>
  );
}

/** Session-only: the banner comes back on the next launch, like web. */
const useNudgeDismissed = create<{ dismissed: boolean }>(() => ({ dismissed: false }));

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 8,
    backgroundColor: colors.fillWeak,
  },
  title: { ...TYPE.uiTitle, color: colors.textStrong },
  body: { ...TYPE.bodySmall, color: colors.textBase, maxWidth: 320 },
  action: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  actionText: { ...TYPE.buttonSmall, color: colors.textInverse },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.fillWeak,
  },
  bannerText: { ...TYPE.bodySmall, color: colors.textStrong, flex: 1 },
  bannerAction: { ...TYPE.buttonSmall, color: colors.brand },
});
