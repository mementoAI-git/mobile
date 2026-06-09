import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, StyleSheet, Keyboard } from 'react-native';
import { ArrowUp, Mic, Square, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVoiceToText } from '@/hooks/use-voice-to-text';

interface ChatInputProps {
  onSend: (text: string) => void;
  /** Opens the voice call overlay (separate from voice-to-text dictation) */
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const btnScale = useSharedValue(1);
  const micPulse = useSharedValue(1);
  const insets = useSafeAreaInsets();

  // Snapshot of text the user had typed BEFORE they tapped the mic.
  // Live dictation partial is appended after this prefix so it never
  // overwrites what the user typed manually.
  const textBeforeDictationRef = useRef('');

  // ─── Voice-to-text (live on-device, no upload) ───────────────────────────

  const handlePartial = useCallback((liveText: string) => {
    // Replace only the dictation portion — keep any text the user typed before
    const prefix = textBeforeDictationRef.current;
    const combined = prefix ? `${prefix} ${liveText}` : liveText;
    setText(combined);
    setMultiline(combined.includes('\n') || combined.length > 80);
  }, []);

  const handleTranscript = useCallback((finalText: string) => {
    // Recognition ended — commit the final text cleanly
    const prefix = textBeforeDictationRef.current;
    const combined = prefix ? `${prefix} ${finalText}` : finalText;
    setText(combined);
    setMultiline(combined.includes('\n') || combined.length > 80);
    textBeforeDictationRef.current = '';
  }, []);

  const {
    isRecording,
    isUnavailable: micUnavailable,
    duration,
    start: startRecording,
    stop: stopRecording,
    cancel: cancelRecording,
  } = useVoiceToText({
    onPartial: handlePartial,
    onTranscript: handleTranscript,
  });

  // ─── Mic pulse animation while recording ─────────────────────────────────

  useEffect(() => {
    if (isRecording) {
      micPulse.value = withRepeat(
        withSequence(withTiming(1.3, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true,
      );
    } else {
      micPulse.value = withSpring(1);
    }
  }, [isRecording, micPulse]);

  const micPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
  }));

  // ─── Keyboard visibility ──────────────────────────────────────────────────

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend(text.trim());
    setText('');
    setMultiline(false);
    textBeforeDictationRef.current = '';
  }, [text, disabled, onSend]);

  const handleMicPress = useCallback(async () => {
    if (disabled) return;
    if (isRecording) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      stopRecording();
    } else {
      // Snapshot the current text so dictation appends after it
      textBeforeDictationRef.current = text.trim();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await startRecording();
    }
  }, [disabled, isRecording, text, stopRecording, startRecording]);

  const handleStop = useCallback(() => {
    if (!onStop) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onStop();
  }, [onStop]);

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  // ─── Derived visibility flags ─────────────────────────────────────────────

  const showStop = loading;
  const showSend = !loading && text.trim().length > 0 && !isRecording;
  const showMic = !loading && !showSend;

  const bottomPadding = keyboardVisible
    ? verticalScale(8)
    : insets.bottom
    ? insets.bottom + verticalScale(8)
    : verticalScale(16);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      className="px-4 py-2.5 bg-transparent"
      style={{ paddingBottom: bottomPadding }}
    >
      <View
        className="flex-row items-center gap-2 bg-white/90 border border-stroke-weaker rounded-[24px] px-3.5 py-1 shadow-md shadow-black/5"
        style={styles.floatingContainer}
      >
        {/* Text input — always visible; dictation streams text directly into it */}
        <View
          className="flex-1 justify-center py-1"
          style={{
            minHeight: multiline ? verticalScale(32) : undefined,
            maxHeight: multiline ? verticalScale(96) : undefined,
            height: multiline ? undefined : verticalScale(32),
          }}
        >
          <TextInput
            value={text}
            onChangeText={(v) => {
              // If user types manually while recording, update the snapshot so
              // subsequent partials don't overwrite their edits
              if (isRecording) {
                textBeforeDictationRef.current = v;
              }
              setText(v);
              setMultiline(v.includes('\n') || v.length > 80);
            }}
            placeholder={
              isRecording
                ? 'Listening…'
                : placeholder
            }
            placeholderTextColor={
              isRecording ? COLORS.brand : COLORS.textMuted
            }
            multiline
            className="text-text-strong"
            style={{
              fontFamily: FONTS.sans,
              paddingVertical: 0,
              textAlignVertical: 'center',
              fontSize: moderateScale(13),
            }}
            blurOnSubmit={false}
            editable={!disabled}
          />

          {/* Subtle live recording indicator below placeholder when no text yet */}
          {isRecording && !text.trim() && (
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="size-1.5 rounded-full bg-error" />
              <Text
                style={{
                  fontFamily: FONTS.sansMedium,
                  fontSize: moderateScale(11),
                  color: COLORS.error,
                }}
              >
                {formatDuration(duration)} · tap mic to finish
              </Text>
            </View>
          )}
        </View>

        {/* Right-side controls */}
        <View className="flex-row items-center gap-1.5">
          {/* Voice call button — only when not dictating */}
          {onVoice && !isRecording && !showStop && (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onVoice();
              }}
              disabled={disabled}
              className="rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
              style={{ width: scale(28), height: scale(28), borderRadius: scale(14) }}
            >
              <Phone size={scale(12)} color={COLORS.textWeak} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* Primary action button */}
          <Animated.View style={[btnAnimStyle]}>
            {showStop && (
              <TouchableOpacity
                onPress={handleStop}
                onPressIn={() => { btnScale.value = withSpring(0.85); }}
                onPressOut={() => { btnScale.value = withSpring(1); }}
                className="rounded-full bg-brand items-center justify-center shadow-md shadow-brand/10"
                style={{ width: scale(32), height: scale(32), borderRadius: scale(16) }}
              >
                <Square size={scale(11)} color={COLORS.textInverse} fill={COLORS.textInverse} />
              </TouchableOpacity>
            )}

            {showSend && (
              <TouchableOpacity
                onPress={handleSend}
                onPressIn={() => { btnScale.value = withSpring(0.85); }}
                onPressOut={() => { btnScale.value = withSpring(1); }}
                disabled={disabled}
                className="rounded-full bg-brand items-center justify-center shadow-md shadow-brand/15"
                style={{ width: scale(32), height: scale(32), borderRadius: scale(16) }}
              >
                <ArrowUp size={scale(15)} color={COLORS.textInverse} strokeWidth={3} />
              </TouchableOpacity>
            )}

            {showMic && (
              <Animated.View style={micPulseStyle}>
                <TouchableOpacity
                  onPress={handleMicPress}
                  disabled={disabled || micUnavailable}
                  className="rounded-full items-center justify-center"
                  style={{
                    width: scale(32),
                    height: scale(32),
                    borderRadius: scale(16),
                    backgroundColor: isRecording ? `${COLORS.error}15` : COLORS.fillWeaker,
                    borderWidth: 1,
                    borderColor: isRecording ? `${COLORS.error}30` : COLORS.strokeWeaker,
                    opacity: micUnavailable ? 0.35 : 1,
                  }}
                >
                  <Mic
                    size={scale(15)}
                    color={isRecording ? COLORS.error : micUnavailable ? COLORS.textMuted : COLORS.brand}
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        </View>
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
