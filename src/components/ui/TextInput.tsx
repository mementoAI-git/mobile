import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState, useRef, useEffect } from 'react';
import { TextInput as RNTextInput, View, Text, TextInputProps, Animated, Platform } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { minTouchTarget, mvs, responsiveSpace } from '@/constants/responsive';
import { useVoiceTextField } from '@/features/voice-control/hooks';

/** Every input field in the app uses 12px corners. */
export const INPUT_RADIUS = 12;

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
  /** `filled`: fillWeak with a strokeWeak border (form pages like Feedback). */
  variant?: 'pill' | 'rounded' | 'filled';
  /** Weak neutral stroke at rest, keeping the variant's fill (Settings inputs). */
  bordered?: boolean;
  /** @deprecated Inputs always use INPUT_RADIUS (12px); this prop is ignored. */
  rounded?: 'full' | 'xl' | 'lg' | number;
  /** What the host calls this field by voice; `false` keeps voice out. */
  voiceLabel?: string | false;
}

export function TextInput({
  label,
  error,
  hint,
  size = 'default',
  variant = 'pill',
  rounded: _rounded,
  containerClassName,
  inputClassName,
  bordered = false,
  rightElement,
  leftElement,
  InputComponent,
  onFocus,
  onBlur,
  voiceLabel,
  ...props
}: InputProps) {
  const COLORS = useThemeColors();
  const [focused, setFocused] = useState(false);
  // Voice can read and type here ("change my nickname to …") so the host
  // sees it typed. Never passwords or other secrets.
  useVoiceTextField(
    voiceLabel === false || props.secureTextEntry
      ? undefined
      : voiceLabel || label || props.accessibilityLabel || props.placeholder,
    props.value,
    props.onChangeText,
    { enabled: props.editable !== false },
  );
  const isRounded = variant === 'rounded';
  const isOutlined = isRounded || variant === 'filled' || bordered;

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
        outputRange: [isOutlined ? COLORS.strokeWeak : COLORS.strokeWeaker, COLORS.brand],
      });

  // Border width: 1 at rest for rounded → 1.5 on focus / always visible for errors
  const borderWidth = error
    ? 1.5
    : focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [isOutlined ? 1 : 0, 1.5],
      });

  const inputHeight = isRounded
    ? (size === 'compact' ? minTouchTarget(46) : minTouchTarget(50))
    : (size === 'compact' ? minTouchTarget(48) : minTouchTarget(56));

  // Input fields always use 12px corners, never pill or large rounded shapes.
  const resolvedRadius = INPUT_RADIUS;

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
            backgroundColor: isRounded ? COLORS.cardRaised : variant === 'filled' ? COLORS.fillWeak : COLORS.fillWeaker,
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
