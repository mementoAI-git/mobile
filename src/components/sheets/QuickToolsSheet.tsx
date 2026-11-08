import React, { useCallback, useId } from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { MusicControllerCard } from '@/components/account/MusicControllerCard';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { SheetHeader } from './SheetHeader';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useUiStore } from '@/store';

export function QuickToolsSheet({ onClose }: { onClose: (afterDismiss?: () => void) => void }) {
  const openSheet = useUiStore((s) => s.openSheet);
  const close = useCallback(() => onClose(), [onClose]);
  const openQuickNote = useCallback(() => openSheet('quick-capture'), [openSheet]);
  const openAddPeople = useCallback(() => openSheet('add-beneficiary'), [openSheet]);
  const quickNote = useCallback(() => onClose(openQuickNote), [onClose, openQuickNote]);
  const addPeople = useCallback(() => onClose(openAddPeople), [onClose, openAddPeople]);

  return (
    <View style={{ gap: SHEET_GROUP_GAP, paddingBottom: 8 }}>
      <SheetHeader title="Quick tools" onClose={close} closeLabel="Close quick tools" />
      <View style={{ gap: SHEET_SECTION_GAP }}>
      <MusicControllerCard compact />
      <View className="gap-2">
        <Text style={TYPE.label} className="text-text-base">Quick actions</Text>
        <View className="flex-row gap-3">
          <Button variant="outline" iconOnly accessibilityLabel="Quick note" className="flex-1 bg-card" style={actionCardStyle} onPress={quickNote}>
            <QuickActionTexture />
            <Image source={require('../../../assets/images/icons/quick-tools/quick-note.png')} style={{ width: 24, height: 24 }} accessible={false} />
            <Text className="text-text-strong" style={TYPE.label}>Quick note</Text>
          </Button>
          <Button variant="outline" iconOnly accessibilityLabel="Add people" className="flex-1 bg-card" style={actionCardStyle} onPress={addPeople}>
            <QuickActionTexture />
            <Image source={require('../../../assets/images/icons/quick-tools/add-people.png')} style={{ width: 24, height: 24 }} accessible={false} />
            <Text className="text-text-strong" style={TYPE.label}>Add people</Text>
          </Button>
        </View>
      </View>
      </View>
    </View>
  );
}

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
