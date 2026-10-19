import React from 'react';
import { Text, View } from 'react-native';
import PhoneCall from 'lucide-react-native/icons/phone-call';
import PhoneOff from 'lucide-react-native/icons/phone-off';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';

export const VoiceSessionDivider = React.memo(function VoiceSessionDivider({ active }: { active: boolean }) {
  const colors = useThemeColors();
  const label = active ? 'Voice conversation started' : 'Voice conversation ended';
  const Icon = active ? PhoneCall : PhoneOff;
  return (
    <View accessible accessibilityLabel={label} className="flex-row items-center gap-3 py-2 mb-3">
      <View className="h-px flex-1 bg-stroke-weak" />
      <View className="flex-row items-center gap-2 shrink">
        <Icon size={14} color={colors.textWeak} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <Text className="text-text-weak text-center shrink" style={TYPE.metadata}>{label}</Text>
      </View>
      <View className="h-px flex-1 bg-stroke-weak" />
    </View>
  );
});
