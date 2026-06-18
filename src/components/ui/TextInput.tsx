import React, { useState, useRef, useEffect } from 'react';
import { TextInput as RNTextInput, View, Text, TextInputProps, Animated, Platform } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS, FONTS } from '@/constants/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** 'default' = h-14 (56px), 'compact' = h-12 (48px) */
  size?: 'default' | 'compact';
  containerClassName?: string;
  inputClassName?: string;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  InputComponent?: any;
}

export function TextInput({
  label,
  error,
  hint,
  size = 'default',
  containerClassName,
  inputClassName,
  rightElement,
  leftElement,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  // Animate from 0 (rest) to 1 (focused)
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, focusAnim]);

  // Border color: strokeWeaker at rest → brand on focus; always error when invalid
  const borderColor = error
    ? COLORS.error
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.strokeWeaker, COLORS.brand],
      });

  // Border width: 0 at rest (invisible) → 1.5 on focus / always visible for errors
  const borderWidth = error
    ? 1.5
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1.5],
      });

  const inputHeight = size === 'compact' ? 48 : 56;

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && (
        <Text
          style={{
            fontFamily: FONTS.sansMedium,
            fontSize: 13,
            color: focused ? COLORS.brand : COLORS.textBase,
            marginLeft: 4,
          }}
        >
          {label}
        </Text>
      )}

      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: props.multiline ? 'flex-start' : 'center',
            backgroundColor: COLORS.fillWeaker,
            borderWidth,
            borderColor,
            borderRadius: props.multiline ? 20 : 999,
            paddingHorizontal: 16,
            minHeight: props.multiline ? undefined : inputHeight,
            height: props.multiline ? undefined : inputHeight,
            paddingVertical: props.multiline ? 14 : 0,
          },
        ]}
      >
        {leftElement && <View style={{ marginRight: 8 }}>{leftElement}</View>}

        {props.InputComponent ? (
          <props.InputComponent
            className={cn('flex-1 text-base text-text-strong', inputClassName)}
            style={{
              fontFamily: FONTS.sans,
              fontSize: 15,
              color: COLORS.textStrong,
              padding: 0,
              ...Platform.select({ android: { paddingVertical: 0 } }),
            }}
            placeholderTextColor={COLORS.textMuted}
            onFocus={(e: any) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e: any) => {
              setFocused(false);
              onBlur?.(e);
            }}
            value={props.value ?? ''}
            {...props}
          />
        ) : (
          <RNTextInput
            className={cn('flex-1 text-base text-text-strong', inputClassName)}
            style={{
              fontFamily: FONTS.sans,
              fontSize: 15,
              color: COLORS.textStrong,
              padding: 0,
              ...Platform.select({ android: { paddingVertical: 0 } }),
            }}
            placeholderTextColor={COLORS.textMuted}
            onFocus={(e: any) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e: any) => {
              setFocused(false);
              onBlur?.(e);
            }}
            value={props.value ?? ''}
            {...props}
          />
        )}

        {rightElement && <View style={{ marginLeft: 8 }}>{rightElement}</View>}
      </Animated.View>

      {error && (
        <Text
          style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.error, marginLeft: 4 }}
        >
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text
          style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textMuted, marginLeft: 4 }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
