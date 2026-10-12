import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import * as Haptics from 'expo-haptics';
import Check from 'lucide-react-native/icons/check';

import { FONTS, COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import type { SelectOption } from '@/components/ui/Select';
import { Separator } from '@/components/ui/Separator';

interface SelectSheetProps {
  options: SelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  onClose: () => void;
}

/**
 * SelectSheet — the bottom-sheet content for the `Select` component.
 * Rendered by `SheetManager` when `activeSheet === 'select'`.
 *
 * Matches the web shadcn Select dropdown visual language:
 * - Options are full-width rows with label + optional description
 * - Active option shows a brand-orange check on the right
 * - `shadow-dropdown` style matches web's `shadow-2xl` on dropdowns
 */
export function SelectSheet({
  options,
  value,
  onValueChange,
  placeholder,
  onClose,
}: SelectSheetProps) {
  const handleSelect = useCallback(
    (option: SelectOption) => {
      Haptics.selectionAsync();
      onValueChange(option.value);
      onClose();
    },
    [onValueChange, onClose],
  );

  const renderItem = ({ item, index }: { item: SelectOption; index: number }) => {
    const isSelected = item.value === value;
    return (
      <>
        <TouchableOpacity
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between py-3.5 px-1"
        >
          <View className="flex-1 gap-0.5">
            <Text
              style={{
                ...(isSelected ? TYPE.label : TYPE.body),
                color: isSelected ? COLORS.textStrong : COLORS.textBase,
              }}
            >
              {item.label}
            </Text>
            {item.description ? (
              <Text
                style={{
                  ...TYPE.metadata,
                  color: COLORS.textWeak,
                }}
              >
                {item.description}
              </Text>
            ) : null}
          </View>
          {isSelected && (
            <Check size={18} color={COLORS.brand} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
        {index < options.length - 1 && <Separator />}
      </>
    );
  };

  return (
    <View className="gap-2">
      {/* Handle label / title */}
      {placeholder && (
        <Text
          className="uppercase tracking-widest text-text-weak mb-1"
          style={TYPE.metadata}>
          {placeholder}
        </Text>
      )}

      <FlatList
        data={options}
        keyExtractor={(item) => item.value}
        renderItem={renderItem}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
