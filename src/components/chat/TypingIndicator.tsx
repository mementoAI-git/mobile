import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { ThinkingOrb } from '@/components/effects/thinking-orb/ThinkingOrb';
import { useResolvedAppearance, useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';

export function TypingIndicator() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const colors = useThemeColors();
  const appearance = useResolvedAppearance();
  return (
    <View className="self-start mb-5 flex-row items-center gap-3 px-4 py-2" accessibilityLiveRegion="polite">
      <ThinkingOrb state="breathing" size={20} displaySize={16} paused={!focused} theme={appearance === 'light' ? 'light' : 'dark'} accessibilityLabel="Memento is thinking" />
      <Text style={[TYPE.bodySmall, { color: colors.textWeak }]}>Thinking…</Text>
    </View>
  );
}
