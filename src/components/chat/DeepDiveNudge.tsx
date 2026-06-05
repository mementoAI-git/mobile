import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, Sparkles } from 'lucide-react-native';
import { FONTS, COLORS } from '@/constants/tokens';
import { dimensionLabel, type LifeDimension } from '@/constants/enrichment';

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
      <View className="flex-row items-start gap-3 bg-white border border-stroke-weaker rounded-2xl p-3.5 shadow-sm">
        {/* Icon */}
        <View className="size-8 rounded-full bg-brand/10 items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={15} color={COLORS.brand} strokeWidth={2} />
        </View>

        {/* Text */}
        <View className="flex-1 gap-1.5">
          <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 12, color: COLORS.textStrong }}>
            Explore {label}
          </Text>
          {question ? (
            <Text
              style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak, lineHeight: 16 }}
              numberOfLines={2}
            >
              {question}
            </Text>
          ) : (
            <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak }}>
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
              className="flex-row items-center gap-1 bg-brand rounded-full px-3 py-1.5"
            >
              <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 11, color: '#fff' }}>
                Go deeper
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onDismiss();
              }}
              activeOpacity={0.7}
              className="flex-row items-center gap-1 border border-stroke-weaker rounded-full px-3 py-1.5"
            >
              <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textWeak }}>
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
          className="size-6 rounded-full bg-fill-weaker items-center justify-center shrink-0"
        >
          <X size={12} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
