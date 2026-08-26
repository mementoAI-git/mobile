import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { COLORS, FONTS } from '@/constants/tokens';
import { Sparkles } from 'lucide-react-native';

interface ChatFollowUpChipsProps {
  prompts: string[];
  onSelectPrompt: (promptText: string) => void;
  visible?: boolean;
}

function FollowUpChip({
  text,
  onPress,
}: {
  text: string;
  onPress: (text: string) => void;
}) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(text);
  }, [text, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={{
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.strokeWeak,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Sparkles size={13} color={COLORS.brand} />
      <Text
        style={{
          fontFamily: FONTS.sansMedium,
          fontSize: 13,
          color: COLORS.textStrong,
          lineHeight: 16,
        }}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const MemoFollowUpChip = React.memo(FollowUpChip);

export function ChatFollowUpChips({
  prompts,
  onSelectPrompt,
  visible = true,
}: ChatFollowUpChipsProps) {
  if (!visible || !prompts || prompts.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{ marginBottom: 6 }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          alignItems: 'center',
        }}
      >
        {prompts.map((question, index) => (
          <MemoFollowUpChip
            key={`${question}-${index}`}
            text={question}
            onPress={onSelectPrompt}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}
