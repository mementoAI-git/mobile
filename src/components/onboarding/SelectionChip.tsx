import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { FONTS } from '@/constants/tokens';

interface SelectionCardProps {
  label: string;
  sublabel?: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
  /** 'radio' = single-select (filled circle), 'check' = multi (checkmark). Default: 'check' */
  variant?: 'check' | 'radio';
}

export function SelectionCard({ label, sublabel, icon, selected, onPress, variant = 'check' }: SelectionCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border ${
        selected
          ? 'bg-brand/[0.06] border-brand'
          : 'bg-card border-stroke-weaker'
      }`}
    >
      {icon ? (
        <Text className="text-xl w-7 text-center">{icon}</Text>
      ) : null}
      <View className="flex-1">
        <Text
          className={`text-sm leading-snug ${selected ? 'text-brand' : 'text-text-strong'}`}
          style={{ fontFamily: FONTS.sansMedium }}
        >
          {label}
        </Text>
        {sublabel ? (
          <Text
            className="text-xs text-text-weak mt-0.5 leading-snug"
            style={{ fontFamily: FONTS.sans }}
          >
            {sublabel}
          </Text>
        ) : null}
      </View>
      <View
        className={`size-5 rounded-full border-2 items-center justify-center shrink-0 ${
          selected ? 'bg-brand border-brand' : 'bg-transparent border-stroke-weak'
        }`}
      >
        {selected && (
          variant === 'radio'
            ? <View className="size-2 rounded-full bg-white" />
            : <Check size={10} color="white" strokeWidth={3} />
        )}
      </View>
    </TouchableOpacity>
  );
}

/** Original pill chip — kept for backwards compat */
export function SelectionChip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`px-4 py-2.5 rounded-full border ${selected ? 'bg-brand border-brand' : 'bg-card border-stroke-weak'}`}
    >
      <Text
        className={`text-sm ${selected ? 'text-white' : 'text-text-base'}`}
        style={{ fontFamily: FONTS.sansMedium }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
