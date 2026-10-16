import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import Mic from 'lucide-react-native/icons/mic';
import { COLORS } from '@/constants/tokens';
import { iconSize, minTouchTarget } from '@/constants/responsive';

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
  const glyphSize = iconSize(20);

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
          size={glyphSize}
          color={active ? COLORS.textInverse : COLORS.textBase}
          strokeWidth={2}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: minTouchTarget(44),
    height: minTouchTarget(44),
    borderRadius: 999,
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
