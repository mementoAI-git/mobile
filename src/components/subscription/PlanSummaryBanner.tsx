import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { hs, radius, responsiveSpace, vs } from '@/constants/responsive';

import { COLORS, PLAN_FREE_GRADIENT } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  getBillingTierPresentation,
} from '@/features/settings/billing-presentation';
import type { SubscriptionSummary } from '@/features/settings/billing-adapters';

interface PlanSummaryBannerProps {
  isProOrAbove: boolean;
  subscriptionKnown: boolean;
  onPress: () => void;
  loading?: boolean;
  tier?: SubscriptionSummary['tier'];
  status?: SubscriptionSummary['status'];
  cancelAtPeriodEnd?: boolean;
  provider?: SubscriptionSummary['provider'];
  /** "Renews Dec 7, 2026", "Trial ends …" or "Access until …", beside Manage plan (web). */
  periodLabel?: string | null;
}

function statusBadgeLabel(
  presentationStatus: string | null,
  status?: SubscriptionSummary['status'],
  cancelAtPeriodEnd?: boolean,
) {
  if (cancelAtPeriodEnd) return 'Cancels at period end';
  if (status === 'trialing') return 'Trial';
  if (status === 'past_due') return 'Past due';
  if (status === 'paused') return 'Paused';
  if (status === 'cancelled') return 'Cancelled';
  return presentationStatus;
}

export const PlanSummaryBanner = React.memo(function PlanSummaryBanner({
  isProOrAbove,
  subscriptionKnown,
  onPress,
  loading = false,
  tier,
  status,
  cancelAtPeriodEnd,
  provider,
  periodLabel,
}: PlanSummaryBannerProps) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const resolvedTier = tier ?? (isProOrAbove ? 'pro' : 'free');
  const presentation = getBillingTierPresentation(resolvedTier);
  const badge = statusBadgeLabel(presentation.statusLabel, status, cancelAtPeriodEnd);

  if (presentation.variant === 'paid') {
    return (
      <Animated.View entering={FadeInDown.delay(80).duration(500)}>
        <LinearGradient
          colors={PLAN_FREE_GRADIENT.colors}
          locations={PLAN_FREE_GRADIENT.locations}
          start={PLAN_FREE_GRADIENT.start}
          end={PLAN_FREE_GRADIENT.end}
          style={{
            borderRadius: 20,
            padding: 20,
            overflow: 'hidden',
          }}
        >
          {/* Top row: Title + Active Badge */}
          <View style={styles.topRow}>
            <Text
              style={styles.title}
            >
              {presentation.title}
            </Text>
            <View
              style={[styles.badge, styles.paidBadge]}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.shadow }} />
              <Text style={[styles.badgeText, { color: COLORS.shadow }]}>
                {badge}
              </Text>
            </View>
          </View>

          {/* Subtitle */}
          <Text
            style={{
              ...TYPE.bodySmall,
              color: 'rgba(255, 255, 255, 0.92)',
              marginTop: 8,
              maxWidth: 320,
            }}
          >
            {provider === 'apple'
              ? 'Billed via Apple App Store. Manage your subscription in your Apple ID settings.'
              : provider === 'google'
              ? 'Billed via Google Play. Manage your subscription in Google Play.'
              : presentation.subtitle}
          </Text>

          {/* Bottom row: Manage plan button, then the renewal date */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={presentation.actionLabel}
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.28)',
              borderRadius: 999,
              paddingHorizontal: 16,
              paddingVertical: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ ...TYPE.buttonSmall, color: COLORS.textInverse }}>
              {presentation.actionLabel}
            </Text>
          </TouchableOpacity>
          {periodLabel ? (
            <Text style={{ ...TYPE.metadata, color: COLORS.textInverse }}>{periodLabel}</Text>
          ) : null}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  // Free Tier Banner
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(500)}>
      <LinearGradient
        colors={PLAN_FREE_GRADIENT.colors}
        locations={PLAN_FREE_GRADIENT.locations}
        start={PLAN_FREE_GRADIENT.start}
        end={PLAN_FREE_GRADIENT.end}
        style={{
          borderRadius: 20,
          padding: 20,
          overflow: 'hidden',
          justifyContent: 'center',
        }}
      >
        {/* Top row: Title + Upgrade pill */}
        <View style={styles.topRow}>
          <Text
            style={styles.title}
          >
            {presentation.title}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Upgrade"
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.badge, styles.upgradeBadge]}
          >
            <Text style={[styles.badgeText, { color: COLORS.textInverse }]}>
              {presentation.actionLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subtitle */}
        <Text
          style={{
            ...TYPE.bodySmall,
            color: 'rgba(255, 255, 255, 0.92)',
            marginTop: 8,
            maxWidth: 320,
          }}
        >
          {presentation.subtitle}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
});

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...TYPE.uiTitle,
    color: COLORS.textInverse,
    flex: 1,
    minWidth: 0,
    marginRight: hs(10),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    maxWidth: '44%',
    gap: responsiveSpace(4),
    borderRadius: 999,
    paddingHorizontal: hs(10),
  },
  paidBadge: {
    backgroundColor: COLORS.textInverse,
    paddingVertical: vs(4),
  },
  upgradeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    minHeight: 44,
  },
  badgeText: {
    ...TYPE.eyebrow,
    flexShrink: 1,
  },
});
