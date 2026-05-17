import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { ArrowUp, Mic, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { cn } from '@/lib/utils';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, FadeInDown } from 'react-native-reanimated';

interface ChatInputProps {
  onSend: (text: string) => void;
  onVoice?: () => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
}

export function ChatInput({
  onSend,
  onVoice,
  onStop,
  disabled,
  placeholder = 'Share a thought...',
  loading,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [multiline, setMultiline] = useState(false);
  const btnScale = useSharedValue(1);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend(text.trim());
    setText('');
    setMultiline(false);
  };

  const handleVoice = () => {
    if (disabled || !onVoice) return;
    Haptics.selectionAsync();
    onVoice();
  };

  const handleStop = () => {
    if (!onStop) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onStop();
  };

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const showStop  = loading;
  const showSend  = !loading && text.trim().length > 0;
  const showVoice = !loading && !text.trim() && onVoice;

  return (
    <Animated.View 
      entering={FadeInDown.duration(400)}
      className="px-4 py-4 bg-transparent"
      style={{ paddingBottom: Platform.OS === 'ios' ? 40 : 20 }}
    >
      <View 
        className="flex-row items-end gap-3 bg-white/90 border border-stroke-weaker rounded-[32px] px-4 py-2 shadow-xl shadow-black/5"
        style={styles.floatingContainer}
      >
        {/* Glassmorphism pill container */}
        <View
          className={cn(
            'flex-1 justify-center',
            multiline ? 'min-h-[44px] max-h-32 py-2' : 'h-[44px]',
          )}
        >
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              setMultiline(v.includes('\n') || v.length > 80);
            }}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            multiline
            className="text-[16px] text-text-strong"
            style={{ 
              fontFamily: FONTS.sans, 
              paddingVertical: 0,
              textAlignVertical: 'center',
            }}
            blurOnSubmit={false}
            editable={!disabled}
          />
        </View>

        {/* Action button */}
        <Animated.View style={btnAnimStyle} className="mb-0.5">
          {showStop && (
            <TouchableOpacity
              onPress={handleStop}
              onPressIn={() => { btnScale.value = withSpring(0.85); }}
              onPressOut={() => { btnScale.value = withSpring(1); }}
              className="size-11 rounded-full bg-brand items-center justify-center shadow-lg shadow-brand/20"
            >
              <Square size={14} color={COLORS.textInverse} fill={COLORS.textInverse} />
            </TouchableOpacity>
          )}

          {showSend && (
            <TouchableOpacity
              onPress={handleSend}
              onPressIn={() => { btnScale.value = withSpring(0.85); }}
              onPressOut={() => { btnScale.value = withSpring(1); }}
              disabled={disabled}
              className="size-11 rounded-full bg-brand items-center justify-center shadow-lg shadow-brand/30"
            >
              <ArrowUp size={20} color={COLORS.textInverse} strokeWidth={3} />
            </TouchableOpacity>
          )}

          {showVoice && (
            <TouchableOpacity
              onPress={handleVoice}
              onPressIn={() => { btnScale.value = withSpring(0.85); }}
              onPressOut={() => { btnScale.value = withSpring(1); }}
              disabled={disabled}
              className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
            >
              <Mic size={20} color={COLORS.brand} strokeWidth={2} />
            </TouchableOpacity>
          )}
          
          {/* Default state button (Disabled Send) */}
          {!showSend && !showStop && !showVoice && (
            <View className="size-11 rounded-full bg-fill-weak items-center justify-center opacity-40">
              <ArrowUp size={20} color={COLORS.textMuted} strokeWidth={2.5} />
            </View>
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
      },
    }),
  },
});
