import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import AlertCircle from 'lucide-react-native/icons/circle-alert';
import { TextInput } from './TextInput';
import { COLORS } from '@/constants/tokens';
import { iconSize } from '@/constants/responsive';
import type { TextInputProps } from 'react-native';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string;
  hint?: string;
  variant?: 'pill' | 'rounded';
  rounded?: 'full' | 'xl' | 'lg' | number;
  containerClassName?: string;
  InputComponent?: React.ElementType<TextInputProps>;
}

// Eye / EyeOff icon toggle + AlertCircle on validation error
export function PasswordInput({
  label,
  error,
  hint,
  variant,
  rounded,
  containerClassName,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const glyphSize = iconSize(20);

  return (
    <TextInput
      label={label}
      error={error}
      hint={hint}
      variant={variant}
      rounded={rounded}
      containerClassName={containerClassName}
      secureTextEntry={!show}
      rightElement={
        error ? (
          <View className="p-1">
            <AlertCircle size={glyphSize} color={COLORS.error} strokeWidth={1.8} />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShow(!show)}
            className="p-1"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
          >
            {show
              ? <Eye size={glyphSize} color={COLORS.textWeak} strokeWidth={1.8} />
              : <EyeOff size={glyphSize} color={COLORS.textWeak} strokeWidth={1.8} />
            }
          </TouchableOpacity>
        )
      }
      {...props}
    />
  );
}
