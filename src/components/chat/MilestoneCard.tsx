import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Trophy } from 'lucide-react-native';
import { FONTS, COLORS } from '@/constants/tokens';

interface MilestoneCardProps {
  /** Points gained this session (0 = don't show) */
  enrichmentDelta?: number | null;
  /** Label for the milestone just reached (null = no milestone) */
  milestoneLabel?: string | null;
}

/**
 * MilestoneCard — mirrors web's MilestoneCard component.
 * Shows when enrichment_delta > 0 (session score gain) or a milestone is newly crossed.
 * Appears as an inline banner in the chat header toolbar.
 */
export function MilestoneCard({ enrichmentDelta, milestoneLabel }: MilestoneCardProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (enrichmentDelta && enrichmentDelta > 0) {
      scale.value = withSequence(withSpring(1.08), withSpring(1));
    }
  }, [enrichmentDelta]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const showDelta = (enrichmentDelta ?? 0) > 0;
  const showMilestone = Boolean(milestoneLabel);

  if (!showDelta && !showMilestone) return null;

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)} style={animStyle}>
      <View className="flex-row items-center gap-1.5 bg-success/10 border border-success/20 rounded-full px-3 py-1.5">
        <Trophy size={13} color={COLORS.success} strokeWidth={2.5} />
        {showMilestone ? (
          <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: COLORS.success }}>
            {milestoneLabel}
          </Text>
        ) : (
          <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: COLORS.success }}>
            +{enrichmentDelta}% enrichment
          </Text>
        )}
      </View>
    </Animated.View>
  );
}
