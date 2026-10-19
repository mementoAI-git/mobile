import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState, useRef, useEffect } from 'react';
import { TextInput as RNTextInput, View, Text, TextInputProps, Animated, Platform } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { minTouchTarget, mvs, radius as responsiveRadius, responsiveSpace } from '@/constants/responsive';

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
  const COLORS = useThemeColors();
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
    ? (size === 'compact' ? minTouchTarget(46) : minTouchTarget(50))
    : (size === 'compact' ? minTouchTarget(48) : minTouchTarget(56));

  const resolvedRadius = rounded
    ? (typeof rounded === 'number'
        ? (rounded >= 999 ? 999 : responsiveRadius(rounded))
        : rounded === 'xl'
          ? responsiveRadius(12)
          : rounded === 'lg'
            ? responsiveRadius(10)
            : 999)
    : (isRounded ? responsiveRadius(12) : (props.multiline ? responsiveRadius(20) : 999));

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
            backgroundColor: isRounded ? COLORS.card : COLORS.fillWeaker,
            borderWidth,
            borderColor,
            borderRadius: resolvedRadius,
            paddingHorizontal: responsiveSpace(16),
            minHeight: props.multiline ? minTouchTarget(44) : inputHeight,
            height: props.multiline ? undefined : inputHeight,
            paddingVertical: props.multiline ? mvs(14, 0.25) : 0,
          },
        ]}
      >
        {leftElement && <View style={{ marginRight: responsiveSpace(8) }}>{leftElement}</View>}

        {InputComponent ? (
          <InputComponent
            className={cn('flex-1 text-text-strong', inputClassName)}
            style={{
              ...TYPE.input,
              color: COLORS.textStrong,
              padding: 0,
              ...Platform.select({ android: { paddingVertical: 0 } }),
            }}
            selectionColor={COLORS.brand}
            cursorColor={COLORS.brand}
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
            selectionColor={COLORS.brand}
            cursorColor={COLORS.brand}
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

        {rightElement && <View style={{ marginLeft: responsiveSpace(8) }}>{rightElement}</View>}
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
