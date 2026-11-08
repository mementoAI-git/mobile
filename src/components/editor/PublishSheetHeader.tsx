import React from 'react';
import { Text, View } from 'react-native';
import { BottomSheetHandle, type BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import X from 'lucide-react-native/icons/x';
import { Button } from '@/components/ui/Button';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { SHEET_HEADER_GAP } from '@/features/layout/sheet-safe-area';
import { SHEET_GRABBER } from '@/features/layout/sheet-presentation';

/** One draggable header contains the indicator, title and close action. */
export function PublishSheetHeader({ onClose, ...handleProps }: BottomSheetHandleProps & { onClose: () => void }) {
  const colors = useThemeColors();
  return <BottomSheetHandle {...handleProps} accessible={false}
    style={{ paddingTop: 8, paddingBottom: 0, paddingHorizontal: 0 }}
    indicatorStyle={{ ...SHEET_GRABBER, backgroundColor: colors.strokeStrong }}>
    <View style={{ marginTop: SHEET_HEADER_GAP, paddingHorizontal: 20, minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ ...TYPE.sheetTitle, color: colors.textStrong }}>Publish post</Text>
      <Button variant="ghost" iconOnly rounded="full" hitSlop={6} onPress={onClose} accessibilityLabel="Close publish sheet"
        style={{ width: 32, height: 32, minHeight: 32, paddingHorizontal: 0, paddingVertical: 0, backgroundColor: colors.fillWeak }}>
        <X size={16} color={colors.textBase} />
      </Button>
    </View>
  </BottomSheetHandle>;
}
