import React from 'react';
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
        A few quick questions so Memento fits you.
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
});
