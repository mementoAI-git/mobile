import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { TextInput } from './TextInput';
import { COLORS } from '@/constants/tokens';
import type { TextInputProps } from 'react-native';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

// Eye / EyeOff icon toggle — matches web password input behaviour
export function PasswordInput({ label, error, containerClassName, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <TextInput
      label={label}
      error={error}
      containerClassName={containerClassName}
      secureTextEntry={!show}
      rightElement={
        <TouchableOpacity
          onPress={() => setShow(!show)}
          className="p-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {show
            ? <EyeOff size={18} color={COLORS.textMuted} />
            : <Eye size={18} color={COLORS.textMuted} />
          }
        </TouchableOpacity>
      }
      {...props}
    />
  );
}
