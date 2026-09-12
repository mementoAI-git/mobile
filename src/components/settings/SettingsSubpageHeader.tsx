import React from 'react';
import { StyleProp, Text, TextStyle, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { getSettingsHeaderLayout } from '@/features/settings/settings-header-layout';

interface SettingsSubpageHeaderProps {
  title: string;
  onBack: () => void;
}

const layout = getSettingsHeaderLayout();

export const SettingsSubpageHeader = React.memo(function SettingsSubpageHeader({
  title,
  onBack,
}: SettingsSubpageHeaderProps) {
  return (
    <View
      style={{
        height: layout.height,
        paddingHorizontal: layout.horizontalPadding,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Go back"
        activeOpacity={0.78}
        onPress={onBack}
        style={{
          width: layout.actionSize,
          height: layout.actionSize,
          borderRadius: layout.actionSize / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.fillWeak,
        }}
      >
        <ArrowLeft size={layout.iconSize} color={COLORS.textBase} />
      </TouchableOpacity>
      <Text style={{ ...TYPE.cardTitle, color: COLORS.textStrong }}>{title}</Text>
      <View style={{ width: layout.actionSize, height: layout.actionSize }} />
    </View>
  );
});
