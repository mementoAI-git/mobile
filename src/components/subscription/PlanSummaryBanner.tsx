import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpCircle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

interface PlanSummaryBannerProps {
  isProOrAbove: boolean;
  subscriptionKnown: boolean;
  onPress: () => void;
  loading?: boolean;
}

export const PlanSummaryBanner = React.memo(function PlanSummaryBanner({
  isProOrAbove,
  subscriptionKnown,
  onPress,
  loading = false,
}: PlanSummaryBannerProps) {
  if (isProOrAbove) {
    return (
      <Animated.View entering={FadeInDown.delay(80).duration(500)}>
        <LinearGradient
          colors={['#FF6200', '#F5A65B']}
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
              You're on Memento Pro
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#FFFFFF',
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 4.5,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#1E1915' }} />
              <Text style={{ ...TYPE.metadata, color: '#1E1915' }}>
                Active
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
            You have full access to Pro features, expanded storage, and richer memory context.
          </Text>

          {/* Bottom row: Manage plan button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Manage plan"
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
              Manage plan
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
        colors={['#0085FF', '#38BDF8']}
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
            Unlock more with Pro
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
            <ArrowUpCircle size={16} color={COLORS.textInverse} strokeWidth={2.2} />
            <Text style={{ ...TYPE.buttonSmall, color: COLORS.textInverse }}>
              Upgrade
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
          Advanced features, more storage and better memory contextualization with Pro.
        </Text>
      </LinearGradient>
    </Animated.View>
  );
});
