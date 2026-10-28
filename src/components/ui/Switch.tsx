import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import {
  Switch as RNSwitch,
  type SwitchProps as RNSwitchProps,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { useVoicePressTarget } from '@/features/voice-control/hooks';

interface SwitchProps extends Omit<RNSwitchProps, 'onValueChange'> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Disable haptic feedback. Default: false */
  disableHaptics?: boolean;
  /** What the host calls this switch, so voice can turn it on or off. Use the row's label. */
  voiceLabel?: string;
}

/**
 * Switch — themed wrapper around React Native's native Switch.
 * - Active track: brand orange (#E98246)
 * - Inactive track: strokeWeak (rgba(23,11,0,0.1))
 * - Thumb: white
 * - Triggers `Haptics.selectionAsync()` on change (per AGENTS.md)
 *
 * Mirrors web's shadcn Switch toggle behavior.
 */
export function Switch({
  value,
  onValueChange,
  disableHaptics = false,
  disabled,
  voiceLabel,
  ...props
}: SwitchProps) {
  const COLORS = useThemeColors();
  useVoicePressTarget(
    voiceLabel ?? props.accessibilityLabel,
    () => onValueChange(!value),
    !disabled,
    value,
  );
  const handleChange = (newValue: boolean) => {
    if (!disableHaptics) {
      Haptics.selectionAsync();
    }
    onValueChange(newValue);
  };

  return (
    <RNSwitch
      {...props}
      value={value}
      onValueChange={handleChange}
      disabled={disabled}
      trackColor={{
        false: COLORS.strokeWeak,
        true: COLORS.brand,
      }}
      thumbColor={Platform.OS === 'android' ? (value ? '#FFFFFF' : '#FFFFFF') : undefined}
      ios_backgroundColor={COLORS.strokeWeak}
      style={{ opacity: disabled ? 0.4 : 1 }}
    />
  );
}
