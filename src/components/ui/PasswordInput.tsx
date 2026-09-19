import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { TextInput } from './TextInput';
import { COLORS } from '@/constants/tokens';
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
            <AlertCircle size={20} color={COLORS.error} strokeWidth={1.8} />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShow(!show)}
            className="p-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {show
              ? <Eye size={20} color={COLORS.textWeak} strokeWidth={1.8} />
              : <EyeOff size={20} color={COLORS.textWeak} strokeWidth={1.8} />
            }
          </TouchableOpacity>
        )
      }
      {...props}
    />
  );
}

