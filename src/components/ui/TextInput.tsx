import React, { useState, useRef, useEffect } from 'react';
import { TextInput as RNTextInput, View, Text, TextInputProps, Animated, Platform } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

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
  variant?: 'pill' | 'rounded';
  rounded?: 'full' | 'xl' | 'lg' | number;
}

export function TextInput({
  label,
  error,
  hint,
  size = 'default',
  variant = 'pill',
  rounded,
  containerClassName,
  inputClassName,
  rightElement,
  leftElement,
  InputComponent,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const isRounded = variant === 'rounded';

  // Animate from 0 (rest) to 1 (focused)
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, focusAnim]);

  // Border color: strokeWeaker/strokeWeak at rest → brand on focus; always error when invalid
  const borderColor = error
    ? COLORS.error
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isRounded ? COLORS.strokeWeak : COLORS.strokeWeaker, COLORS.brand],
      });

  // Border width: 1 at rest for rounded → 1.5 on focus / always visible for errors
  const borderWidth = error
    ? 1.5
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isRounded ? 1 : 0, 1.5],
      });

  const inputHeight = isRounded
    ? (size === 'compact' ? 46 : 50)
    : (size === 'compact' ? 48 : 56);

  const radius = rounded
    ? (typeof rounded === 'number' ? rounded : rounded === 'xl' ? 12 : rounded === 'lg' ? 10 : 999)
    : (isRounded ? 12 : (props.multiline ? 20 : 999));

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && (
        <Text
          style={{
            ...(isRounded ? TYPE.label : TYPE.bodySmall),
            color: isRounded ? COLORS.textStrong : (focused ? COLORS.brand : COLORS.textBase),
            marginLeft: 2,
            marginBottom: isRounded ? 2 : 0,
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
            backgroundColor: isRounded ? '#ffffff' : COLORS.fillWeaker,
            borderWidth,
            borderColor,
            borderRadius: radius,
            paddingHorizontal: 16,
            minHeight: props.multiline ? undefined : inputHeight,
            height: props.multiline ? undefined : inputHeight,
            paddingVertical: props.multiline ? 14 : 0,
          },
        ]}
      >
        {leftElement && <View style={{ marginRight: 8 }}>{leftElement}</View>}

        {InputComponent ? (
          <InputComponent
            className={cn('flex-1 text-text-strong', inputClassName)}
            style={{
              ...TYPE.input,
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
            className={cn('flex-1 text-text-strong', inputClassName)}
            style={{
              ...TYPE.input,
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
          style={{ ...TYPE.bodySmall, color: COLORS.error, marginLeft: 4 }}
        >
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text
          style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginLeft: 4 }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
