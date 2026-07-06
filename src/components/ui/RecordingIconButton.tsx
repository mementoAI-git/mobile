import React from 'react';
import { StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Mic } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';

interface RecordingIconButtonProps {
  active?: boolean;
  disabled?: boolean;
  muted?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function RecordingIconButton({
  active,
  disabled,
  muted,
  onPress,
  children,
  style,
}: RecordingIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      style={[
        styles.button,
        style,
        active && styles.active,
        muted && styles.muted,
        disabled && styles.disabled,
      ]}
    >
      {children ?? (
        <Mic
          size={20}
          color={active ? COLORS.textInverse : COLORS.textBase}
          strokeWidth={2}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  disabled: {
    opacity: 0.4,
  },
  muted: {
    opacity: 0.45,
  },
});
