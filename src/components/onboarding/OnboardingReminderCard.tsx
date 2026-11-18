import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { TouchableOpacity } from '@/components/ui/Touchable';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { isOnboardingComplete, openOnboarding } from '@/features/onboarding/onboarding-resume';
import { useThemeStyles } from '@/hooks/use-theme-colors';
import { useUserStore } from '@/store';

/**
 * A standing prompt in Settings to finish onboarding. It has no dismiss
 * button; it only goes away once onboarding is completed. Mirrors web
 * `OnboardingReminderCard` (`.insights-card.insights-onboarding`): one compact
 * row with short copy and a small "Start" pill.
 */
export function OnboardingReminderCard() {
  const user = useUserStore((s) => s.user);
  const router = useRouter();
  const styles = useThemeStyles(createStyles);
  const open = useCallback(() => {
    void Haptics.selectionAsync();
    openOnboarding(router);
  }, [router]);
  if (!user || isOnboardingComplete(user)) return null;
  return (
    <View style={styles.card} accessibilityLabel="Finish onboarding">
      <View style={styles.copy}>
        <Text style={styles.title}>Finish setting up Memento</Text>
        <Text style={styles.body}>A few quick questions so Memento fits you.</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Complete onboarding"
        onPress={open}
        activeOpacity={0.8}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={styles.action}
      >
        {/* Web: color-mix(text-neutral-strong 16%). */}
        <View style={styles.actionFill} />
        <Text style={styles.actionText}>Start</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    backgroundColor: colors.fillWeak,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...TYPE.rowTitle, color: colors.textStrong },
  body: { ...TYPE.bodySmall, color: colors.textBase },
  action: {
    flexShrink: 0,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionFill: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: colors.textStrong,
    opacity: 0.16,
  },
  actionText: { ...TYPE.buttonSmall, color: colors.textStrong },
});
