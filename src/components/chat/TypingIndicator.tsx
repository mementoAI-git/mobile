import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { ThinkingOrb } from '@/components/effects/thinking-orb/ThinkingOrb';
import { useResolvedAppearance, useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';

/** `status` says what Memento is doing ("Looking through your stories…"). */
export function TypingIndicator({ status }: { status?: string }) {
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const colors = useThemeColors();
  const appearance = useResolvedAppearance();
  return (
    <View className="self-start mb-5 flex-row items-center gap-3 px-4 py-2" accessibilityLiveRegion="polite">
      <ThinkingOrb state="breathing" size={20} displaySize={16} paused={!focused} theme={appearance === 'light' ? 'light' : 'dark'} accessibilityLabel={status || 'Memento is thinking'} />
      <Text style={[TYPE.bodySmall, { color: colors.textWeak }]}>{status || 'Thinking…'}</Text>
    </View>
  );
}
