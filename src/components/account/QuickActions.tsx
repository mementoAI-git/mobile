import React, { useId } from 'react';
import { Image, type ImageSourcePropType, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';

const QUICK_NOTE_ICON = require('../../../assets/images/icons/quick-tools/quick-note.png');
const ADD_PEOPLE_ICON = require('../../../assets/images/icons/quick-tools/add-people.png');
const INSIGHTS_ICON = require('../../../assets/images/icons/quick-tools/insights.png');

interface QuickActionsProps {
  onQuickNote: () => void;
  onAddPeople: () => void;
  onInsights: () => void;
}

// The account page's Quick actions, carried over from the old Quick tools sheet.
export function QuickActions({ onQuickNote, onAddPeople, onInsights }: QuickActionsProps) {
  return (
    <View className="gap-2">
      <Text style={TYPE.label} className="text-text-base">Quick actions</Text>
      <View className="flex-row gap-3">
        <QuickActionCard label="Quick note" icon={QUICK_NOTE_ICON} onPress={onQuickNote} />
        <QuickActionCard label="Add people" icon={ADD_PEOPLE_ICON} onPress={onAddPeople} />
        <QuickActionCard label="Insights" icon={INSIGHTS_ICON} onPress={onInsights} />
      </View>
    </View>
  );
}

const QuickActionCard = React.memo(function QuickActionCard({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ImageSourcePropType;
  onPress: () => void;
}) {
  return (
    <Button variant="outline" iconOnly accessibilityLabel={label} className="flex-1 bg-card" style={actionCardStyle} onPress={onPress}>
      <QuickActionTexture />
      <Image source={icon} style={{ width: 24, height: 24 }} accessible={false} />
      <Text className="text-text-strong" style={TYPE.label} numberOfLines={1}>{label}</Text>
    </Button>
  );
});

const actionCardStyle = {
  height: 85, padding: 12, paddingHorizontal: 12, paddingVertical: 12, gap: 12,
  flexDirection: 'column', borderRadius: 14, overflow: 'hidden',
  alignItems: 'flex-start', justifyContent: 'space-between',
} as const;

function QuickActionTexture() {
  const colors = useThemeColors();
  const patternId = `quick-action-grid-${useId().replace(/:/g, '')}`;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: -16, right: -16, bottom: -16, left: -16, opacity: 0.4, transform: [{ skewX: '-6deg' }] }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={patternId} width={32} height={32} patternUnits="userSpaceOnUse">
            <Path d="M32 0H0V32" fill="none" stroke={colors.strokeWeaker} strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}
