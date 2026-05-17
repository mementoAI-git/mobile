import React, { useState } from 'react';
import { TextInput as RNTextInput, View, Text, TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS, FONTS } from '@/constants/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  inputClassName?: string;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  InputComponent?: any;
}

// Matches web shadcn Input + legacy .input-base:
//   rounded-full (web rounded-4xl = 32px)
//   bg-fill-weaker (near-transparent warm tint, web bg-input/30)
//   border-stroke-weak at rest
//   border-brand on focus (web --ring = #FF5E00)
//   min-h-[44px] tap target (web .input-base = h-[44px])
//   label: text-sm font-medium text-text-base (web .input-label)
export function TextInput({
  label,
  error,
  hint,
  containerClassName,
  inputClassName,
  rightElement,
  leftElement,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && (
        <Text
          className="text-sm font-medium text-text-base capitalize"
          style={{ fontFamily: FONTS.sansMedium }}
        >
          {label}
        </Text>
      )}

      <View
        className={cn(
          'flex-row items-center min-h-[44px] border px-4 bg-fill-weaker',
          props.multiline ? 'rounded-2xl py-3 items-start' : 'rounded-full',
          focused ? 'border-brand' : 'border-stroke-weak',
          error && 'border-error-strong',
        )}
      >
        {leftElement && <View className="mr-2">{leftElement}</View>}

        {props.InputComponent ? (
          <props.InputComponent
            className={cn('flex-1 py-2 text-base text-text-strong', inputClassName)}
            style={{ fontFamily: FONTS.sans }}
            placeholderTextColor={COLORS.textWeak}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            value={props.value ?? ''}
            {...props}
          />
        ) : (
          <RNTextInput
            className={cn('flex-1 py-2 text-base text-text-strong', inputClassName)}
            style={{ fontFamily: FONTS.sans }}
            placeholderTextColor={COLORS.textWeak}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            value={props.value ?? ''}
            {...props}
          />
        )}

        {rightElement && <View className="ml-2">{rightElement}</View>}
      </View>

      {error && (
        <Text className="text-xs text-text-error" style={{ fontFamily: FONTS.sans }}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sans }}>
          {hint}
        </Text>
      )}
    </View>
  );
}
