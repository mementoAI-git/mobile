import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  Pressable,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { isCompleteOtp, normalizeOtpInput } from '@/features/auth/email-verification';
import { TYPE } from '@/constants/typography';

export interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

const OTP_CELLS = [0, 1, 2, 3, 4, 5];

export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: OtpCodeInputProps) {
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    inputRef.current?.focus();
  };

  const handleTextChange = (text: string) => {
    const normalized = normalizeOtpInput(text);
    if (normalized !== value) {
      Haptics.selectionAsync();
      onChange(normalized);
      if (isCompleteOtp(normalized)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onComplete?.(normalized);
      }
    }
  };

  // Determine which cell index is currently active for typing
  const activeIndex = Math.min(value.length, 5);

  return (
    <Pressable
      onPress={handlePress}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Verification code input, currently ${value.length} of 6 digits entered`}
      className="w-full my-2"
    >
      {/* 6 Visual Digit Cells */}
      <View className="flex-row items-center justify-between gap-2.5">
        {OTP_CELLS.map((index) => {
          const char = value[index] ?? '';
          const isCellActive = isFocused && !disabled && index === activeIndex;

          let borderClass = 'border-stroke-weaker';
          if (hasError) {
            borderClass = 'border-error';
          } else if (isCellActive) {
            borderClass = 'border-brand border-2';
          } else if (char) {
            borderClass = 'border-stroke-weak';
          }

          return (
            <View
              key={index}
              className={`flex-1 h-14 sm:h-16 items-center justify-center rounded-2xl bg-fill-weaker border ${borderClass}`}
            >
              <Text
                className="text-text-strong text-center"
                style={TYPE.uiTitle}
              >
                {char}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Hidden Native Input for Autofill, Paste, and Keyboard */}
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        maxLength={6}
        editable={!disabled}
        autoFocus={autoFocus}
        caretHidden
        className="absolute -top-[9999px] -left-[9999px] w-1 h-1 opacity-0"
        aria-hidden
      />
    </Pressable>
  );
}
