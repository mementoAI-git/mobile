import { useThemeColors, useThemedStyles } from '@/hooks/use-theme-colors';
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import Mic from 'lucide-react-native/icons/mic';
import { COLORS } from '@/constants/tokens';
import { iconSize, minTouchTarget } from '@/constants/responsive';

interface RecordingIconButtonProps {
  accessibilityLabel?: string;
  active?: boolean;
  neutral?: boolean;
  hitSlop?: number;
  disabled?: boolean;
  muted?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function RecordingIconButton({
  active,
  neutral,
  hitSlop,
  accessibilityLabel,
  disabled,
  muted,
  onPress,
  children,
  style,
}: RecordingIconButtonProps) {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  const glyphSize = iconSize(20);

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={hitSlop}
      activeOpacity={0.78}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? (active ? 'Stop recording audio' : 'Record audio')}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      style={[
        styles.button,
        style,
        active && (neutral ? { backgroundColor: COLORS.fillWeak } : styles.active),
        muted && styles.muted,
        disabled && styles.disabled,
      ]}
    >
      {children ?? (
        <Mic
          size={glyphSize}
          color={active && !neutral ? COLORS.textInverse : COLORS.textBase}
          strokeWidth={2}
        />
      )}
    </TouchableOpacity>
  );
}

const stylesBase = StyleSheet.create({
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
