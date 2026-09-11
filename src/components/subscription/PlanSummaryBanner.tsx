import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpCircle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';

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
  const title = !subscriptionKnown
    ? 'Your Memento plan'
    : isProOrAbove
      ? 'Your Pro legacy is active'
      : 'Unlock more with Pro';
  const description = !subscriptionKnown
    ? 'Review your plan, storage and account benefits.'
    : isProOrAbove
      ? 'More room for the stories, voices and moments that matter.'
      : 'Advanced features, more storage and richer memory contextualization.';

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(500)}>
      <LinearGradient
        colors={[COLORS.info, COLORS.blue6]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 11,
          minHeight: 82,
          overflow: 'hidden',
        }}
      >
        <View style={{ paddingRight: 112 }}>
          <Text
            style={{
              color: COLORS.textInverse,
              ...TYPE.bodyLarge,
              lineHeight: 20,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: COLORS.textInverse,
              opacity: 0.82,
              ...TYPE.metadata,
              lineHeight: 16,
              marginTop: 5,
            }}
          >
            {description}
          </Text>
        </View>

        <Button
          onPress={onPress}
          loading={loading}
          variant="secondary"
          size="sm"
          className="absolute right-3 top-3 h-8 bg-white/20 px-3"
          textClassName="text-white"
          leftIcon={<ArrowUpCircle size={15} color={COLORS.textInverse} strokeWidth={2.4} />}
        >
          {subscriptionKnown && !isProOrAbove ? 'Upgrade' : 'Plan details'}
        </Button>
      </LinearGradient>
    </Animated.View>
  );
});
