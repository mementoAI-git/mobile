import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import * as Haptics from 'expo-haptics';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useUiStore } from '@/store';
import { cn } from '@/lib/utils';

// ─── Types (exported so SelectSheet can use them) ──────────────────────────

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

export interface SelectProps extends Omit<ViewProps, 'style'> {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Label shown above the trigger */
  label?: string;
  className?: string;
}

/**
 * Select — trigger-only component. Tapping opens a bottom sheet (SelectSheet)
 * via `useUiStore.openSheet('select', props)` — consistent with the global
 * sheet pattern (no local Modal state).
 *
 * Mirrors web shadcn `<Select />` trigger:
 * - Pill shape (`rounded-4xl`)
 * - `bg-fill-weaker` fill + `stroke-weak` border
 * - 36px height matches web's `h-9` input
 */
export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  disabled = false,
  label,
  className,
  ...props
}: SelectProps) {
  const openSheet = useUiStore((s) => s.openSheet);
  const selectedOption = options.find((o) => o.value === value);

  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    openSheet('select', { options, value, onValueChange, placeholder });
  };

  return (
    <View {...props}>
      {label && (
        <Text
          className="mb-1.5 text-text-strong"
          style={TYPE.label}
        >
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        className={cn(
          'h-11 flex-row items-center justify-between px-4 rounded-full',
          'bg-fill-weaker',
          disabled && 'opacity-40',
          className,
        )}
      >
        <Text
          style={{
            ...TYPE.input,
            color: selectedOption ? COLORS.textStrong : COLORS.textWeak,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color={COLORS.textWeak} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}
