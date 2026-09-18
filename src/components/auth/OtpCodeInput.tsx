import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
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
  error?: boolean;
  autoFocus?: boolean;
}

const OTP_CELLS = [0, 1, 2, 3, 4, 5];

export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpCodeInputProps) {
  const inputRef = useRef<RNTextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.selectionAsync();
    inputRef.current?.focus();
  }, [disabled]);

  const handleTextChange = useCallback((text: string) => {
    if (disabled) return;
    const normalized = normalizeOtpInput(text);
    if (normalized !== value) {
      Haptics.selectionAsync();
      onChange(normalized);
      if (isCompleteOtp(normalized)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onComplete?.(normalized);
      }
    }
  }, [disabled, onChange, onComplete, value]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  // Determine which cell index is currently active for typing
  const activeIndex = Math.min(value.length, 5);

  return (
    <View className="w-full my-2">
      {/* 6 Visual Digit Cells */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="flex-row items-center justify-between gap-2.5"
      >
        {OTP_CELLS.map((index) => {
          const char = value[index] ?? '';
          const isCellActive = isFocused && !disabled && index === activeIndex;

          let borderClass = 'border-stroke-weaker';
          if (error) {
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

      {/* Transparent native input owns editing, accessibility, autofill, and paste. */}
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        onPressIn={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        editable={!disabled}
        autoFocus={autoFocus}
        caretHidden
        accessibilityLabel="Verification code"
        accessibilityHint={error ? 'Check your six-digit code and try again.' : 'Enter the six-digit code from your email.'}
        accessibilityState={{ disabled }}
        style={TYPE.input}
        className="absolute inset-0 w-full h-full text-transparent bg-transparent"
      />
    </View>
  );
}
