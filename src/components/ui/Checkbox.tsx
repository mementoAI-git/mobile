import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';
import { cn } from '@/lib/utils';
import { ms, radius } from '@/constants/responsive';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Size in px. Default: 20 */
  size?: number;
  className?: string;
}

/**
 * Checkbox — custom implementation, mirrors web shadcn `<Checkbox />`.
 * - Shape: `rounded-md` (6px) — matches web's `rounded-[6px]`
 * - Unchecked: white fill + `stroke-weak` border (1px)
 * - Checked: brand orange fill + white check icon
 * - Disabled: 0.4 opacity
 * - Haptic on press (per AGENTS.md)
 */
export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  size = 20,
  className,
}: CheckboxProps) {
  const scaledSize = ms(size, 0.2);
  const hitPadding = Math.max(12, Math.round((44 - scaledSize) / 2));

  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    onCheckedChange(!checked);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: hitPadding, bottom: hitPadding, left: hitPadding, right: hitPadding }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View
        className={cn(
          'items-center justify-center border',
          checked
            ? 'border-brand bg-brand'
            : 'border-stroke-weak bg-white',
          className,
        )}
        style={{
          width: scaledSize,
          height: scaledSize,
          borderRadius: radius(6), // matches web's rounded-[6px] on Checkbox
        }}
      >
        {checked && (
          <Check
            size={scaledSize * 0.65}
            color={COLORS.textInverse}
            strokeWidth={2.5}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
