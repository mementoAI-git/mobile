import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { getSettingsHeaderLayout } from '@/features/settings/settings-header-layout';

interface SettingsSubpageHeaderProps {
  title: string;
  /** Muted italic word after the title, like web's "People & <em>groups</em>". */
  accent?: string;
  onBack: () => void;
  /** Right-side control; an equal spacer keeps the title centred when absent. */
  right?: React.ReactNode;
}

const layout = getSettingsHeaderLayout();

export const SettingsSubpageHeader = React.memo(function SettingsSubpageHeader({
  title,
  accent,
  onBack,
  right,
}: SettingsSubpageHeaderProps) {
  const COLORS = useThemeColors();
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
      <Text numberOfLines={1} style={{ ...TYPE.cardTitle, color: COLORS.textStrong, flexShrink: 1, textAlign: 'center' }}>
        {title}
        {accent ? <Text style={{ ...TYPE.cardTitleAccent, color: COLORS.textWeak }}> {accent}</Text> : null}
      </Text>
      {right ?? <View style={{ width: layout.actionSize, height: layout.actionSize }} />}
    </View>
  );
});
