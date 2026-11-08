import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TouchableOpacity } from '@/components/ui/Touchable';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import type { SubscriptionSummary } from '@/features/settings/billing-adapters';
import { useThemeStyles } from '@/hooks/use-theme-colors';

/**
 * The paid plan card from web `features/insights/plan-summary-card.tsx`: a
 * neutral card (no orange), the plan title and copy on the left and a
 * "Manage plan" pill on the right. Mobile adds the renewal date under the copy.
 */
export const ProPlanCard = React.memo(function ProPlanCard({
  tier,
  status,
  periodLabel,
  onManage,
}: {
  tier?: SubscriptionSummary['tier'];
  status?: SubscriptionSummary['status'];
  periodLabel?: string | null;
  onManage: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  const title = status === 'trialing'
    ? 'You’re on a Memento Pro trial'
    : tier === 'legacy'
      ? 'You’re on Memento Legacy'
      : 'You’re on Memento Pro';
  const body = status === 'active' || status === 'trialing' || !status
    ? 'You have full access to Pro features, expanded storage, and richer memory context.'
    : 'Manage your subscription to review your plan and payment status.';

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.card} accessibilityLabel="Your plan">
      <View style={styles.words}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {periodLabel ? <Text style={styles.period}>{periodLabel}</Text> : null}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Manage plan"
        activeOpacity={0.8}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        onPress={() => {
          Haptics.selectionAsync();
          onManage();
        }}
        style={styles.action}
      >
        <Text style={styles.actionText}>Manage plan</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Web .insights-card.insights-plan, at the Billing cards' 20px radius and padding.
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 20,
    padding: 20,
    backgroundColor: colors.fillWeak,
  },
  words: { flex: 1, minWidth: 0, gap: 4 },
  title: { ...TYPE.bodyLargeSemi, color: colors.textStrong },
  body: { ...TYPE.bodySmall, color: colors.textBase },
  period: { ...TYPE.metadata, color: colors.textWeak, marginTop: 4 },
  // Web .insights-plan-action: a neutral pill (text-neutral-strong at 16%).
  action: {
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.strokeWeak,
  },
  actionText: { ...TYPE.buttonSmall, color: colors.textStrong },
});
