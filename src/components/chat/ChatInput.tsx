import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Platform, StyleSheet, Keyboard } from 'react-native';
import { ArrowUp, Mic, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { cn } from '@/lib/utils';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, FadeInDown } from 'react-native-reanimated';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
 
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
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
 
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

  const bottomPadding = keyboardVisible
    ? verticalScale(8)
    : (insets.bottom ? insets.bottom + verticalScale(8) : verticalScale(16));
 
  return (
    <Animated.View 
      entering={FadeInDown.duration(400)}
      className="px-4 py-4 bg-transparent"
      style={{ paddingBottom: bottomPadding }}
    >
      <View 
        className="flex-row items-end gap-3 bg-white/90 border border-stroke-weaker rounded-[32px] px-4 py-2 shadow-xl shadow-black/5"
        style={styles.floatingContainer}
      >
        {/* Glassmorphism pill container */}
        <View
          className="flex-1 justify-center py-2"
          style={{
            minHeight: multiline ? verticalScale(44) : undefined,
            maxHeight: multiline ? verticalScale(128) : undefined,
            height: multiline ? undefined : verticalScale(44)
          }}
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
            className="text-text-strong"
            style={{ 
              fontFamily: FONTS.sans, 
              paddingVertical: 0,
              textAlignVertical: 'center',
              fontSize: moderateScale(16)
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
              className="rounded-full bg-brand items-center justify-center shadow-lg shadow-brand/20"
              style={{ width: scale(44), height: scale(44), borderRadius: scale(22) }}
            >
              <Square size={scale(14)} color={COLORS.textInverse} fill={COLORS.textInverse} />
            </TouchableOpacity>
          )}
 
          {showSend && (
            <TouchableOpacity
              onPress={handleSend}
              onPressIn={() => { btnScale.value = withSpring(0.85); }}
              onPressOut={() => { btnScale.value = withSpring(1); }}
              disabled={disabled}
              className="rounded-full bg-brand items-center justify-center shadow-lg shadow-brand/30"
              style={{ width: scale(44), height: scale(44), borderRadius: scale(22) }}
            >
              <ArrowUp size={scale(20)} color={COLORS.textInverse} strokeWidth={3} />
            </TouchableOpacity>
          )}
 
          {showVoice && (
            <TouchableOpacity
              onPress={handleVoice}
              onPressIn={() => { btnScale.value = withSpring(0.85); }}
              onPressOut={() => { btnScale.value = withSpring(1); }}
              disabled={disabled}
              className="rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
              style={{ width: scale(44), height: scale(44), borderRadius: scale(22) }}
            >
              <Mic size={scale(20)} color={COLORS.brand} strokeWidth={2} />
            </TouchableOpacity>
          )}
          
          {/* Default state button (Disabled Send) */}
          {!showSend && !showStop && !showVoice && (
            <View 
              className="rounded-full bg-fill-weak items-center justify-center opacity-40"
              style={{ width: scale(44), height: scale(44), borderRadius: scale(22) }}
            >
              <ArrowUp size={scale(20)} color={COLORS.textMuted} strokeWidth={2.5} />
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
