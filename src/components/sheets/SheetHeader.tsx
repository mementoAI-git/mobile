import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import X from 'lucide-react-native/icons/x';
import { Button } from '@/components/ui/Button';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { SHEET_CLOSE_BUTTON_STYLE } from '@/features/layout/sheet-safe-area';

interface SheetHeaderProps {
  title: string;
  onClose?: () => void;
  /** Accessibility label for the close control. Defaults to "Close". */
  closeLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The standard bottom-sheet header: title (sheetTitle) left, close control
 * right. Sits 8px under the grabber (handle style); keep 32px (SHEET_GROUP_GAP)
 * between it, the body and the actions.
 */
export function SheetHeader({ title, onClose, closeLabel = 'Close', style }: SheetHeaderProps) {
  const colors = useThemeColors();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, style]}>
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', minHeight: 44 }}>
        <Text accessibilityRole="header" style={{ ...TYPE.sheetTitle, color: colors.textStrong }}>
          {title}
        </Text>
      </View>
      {onClose ? (
        <Button
          iconOnly
          variant="secondary"
          rounded="full"
          accessibilityLabel={closeLabel}
          onPress={() => {
            Haptics.selectionAsync();
            onClose();
          }}
          style={SHEET_CLOSE_BUTTON_STYLE}
        >
          <X size={20} color={colors.textStrong} />
        </Button>
      ) : null}
    </View>
  );
}
