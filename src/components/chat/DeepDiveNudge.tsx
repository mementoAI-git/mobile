import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import X from 'lucide-react-native/icons/x';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { dimensionLabel, type LifeDimension } from '@/constants/enrichment';
import { iconSize, radius, minTouchTarget, responsiveSpace } from '@/constants/responsive';

const CHAT_ORB = require('../../../assets/images/onboarding/chat-ai-orb.png');

interface DeepDiveNudgeProps {
  dimension: LifeDimension;
  question: string | null;
  onDeepDive: () => void;
  onDismiss: () => void;
}

/**
 * DeepDiveNudge — mirrors web's DeepDiveNudge component.
 * AI-surfaced suggestion to explore an underrepresented life dimension.
 * Shown in the chat header toolbar when chatMode === 'open' and a nudge is available.
 */
export function DeepDiveNudge({ dimension, question, onDeepDive, onDismiss }: DeepDiveNudgeProps) {
  const label = dimensionLabel(dimension);

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(200)}
      className="mx-4 mb-2"
    >
      <View
        className="flex-row items-start gap-3 bg-white border border-stroke-weaker rounded-2xl p-3.5 shadow-sm"
        style={{ borderRadius: radius(16) }}
      >
        {/* AI Host Orb */}
        <Image
          source={CHAT_ORB}
          style={{ width: iconSize(32), height: iconSize(32), marginTop: 2 }}
          resizeMode="contain"
        />

        {/* Text */}
        <View className="flex-1 gap-1.5">
          <Text style={{ ...TYPE.label, color: COLORS.textStrong }}>
            Explore {label}
          </Text>
          {question ? (
            <Text
              style={{ ...TYPE.metadata, color: COLORS.textWeak }}
              numberOfLines={2}
            >
              {question}
            </Text>
          ) : (
            <Text style={{ ...TYPE.metadata, color: COLORS.textWeak }}>
              You haven't shared much here yet. Want to go deeper?
            </Text>
          )}

          {/* Actions */}
          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDeepDive();
              }}
              activeOpacity={0.8}
              hitSlop={6}
              className="flex-row items-center gap-1 bg-brand rounded-full px-3 py-1.5"
            >
              <Text style={{ ...TYPE.metadata, color: '#fff' }}>
                Go deeper
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onDismiss();
              }}
              activeOpacity={0.7}
              hitSlop={6}
              className="flex-row items-center gap-1 border border-stroke-weaker rounded-full px-3 py-1.5"
            >
              <Text style={{ ...TYPE.metadata, color: COLORS.textWeak }}>
                Not now
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dismiss X */}
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            onDismiss();
          }}
          activeOpacity={0.7}
          hitSlop={10}
          className="size-6 rounded-full bg-fill-weaker items-center justify-center shrink-0"
        >
          <X size={iconSize(12)} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
