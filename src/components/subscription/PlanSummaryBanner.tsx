import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { COLORS } from '@/constants/tokens';
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
}: PlanSummaryBannerProps) {
  const resolvedTier = tier ?? (isProOrAbove ? 'pro' : 'free');
  const presentation = getBillingTierPresentation(resolvedTier);
  const badge = statusBadgeLabel(presentation.statusLabel, status, cancelAtPeriodEnd);

  if (presentation.variant === 'paid') {
    return (
      <Animated.View entering={FadeInDown.delay(80).duration(500)}>
        <LinearGradient
          colors={[COLORS.brand, COLORS.statYellow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 24,
            padding: 20,
            overflow: 'hidden',
          }}
        >
          {/* Top row: Title + Active Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                ...TYPE.uiTitle,
                color: COLORS.textInverse,
              }}
            >
              {presentation.title}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: COLORS.textInverse,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4.5,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.shadow }} />
              <Text style={{ ...TYPE.metadata, color: COLORS.shadow }}>
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

          {/* Bottom row: Manage plan button */}
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
              marginTop: 14,
            }}
          >
            <Text style={{ ...TYPE.buttonSmall, color: COLORS.textInverse }}>
              {presentation.actionLabel}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  }

  // Free Tier Banner
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(500)}>
      <LinearGradient
        colors={[
          COLORS.info,
          COLORS.blue6,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          padding: 20,
          overflow: 'hidden',
          justifyContent: 'center',
        }}
      >
        {/* Top row: Title + Upgrade pill */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              ...TYPE.uiTitle,
              color: COLORS.textInverse,
            }}
          >
            {presentation.title}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Upgrade"
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              borderRadius: 999,
              paddingHorizontal: 13,
              paddingVertical: 6,
            }}
          >
            <Text style={{ ...TYPE.buttonSmall, color: COLORS.textInverse }}>
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
