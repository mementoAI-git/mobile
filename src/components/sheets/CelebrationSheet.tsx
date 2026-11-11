import React, { useEffect } from 'react';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';
import { SheetActions, SHEET_FILL } from './SheetActions';
import * as Haptics from 'expo-haptics';
import X from 'lucide-react-native/icons/x';
import { Button } from '@/components/ui/Button';
import { TYPE } from '@/constants/typography';
import { SHEET_CLOSE_BUTTON_STYLE, SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface CelebrationSheetProps {
  image: ImageSourcePropType;
  title: string;
  description: string;
  closeLabel: string;
  onClose?: () => void;
  /** Optional body content under the description (a story card, a perks list). */
  children?: React.ReactNode;
  /** Buttons, full width, stacked. */
  actions: React.ReactNode;
}

/**
 * Celebration sheets (first story, Pro upgrade): the standard sheet close
 * control and spacing, with the alert-style centred hero. 32px between the
 * hero, the body and the actions; 24px inside the hero.
 */
export function CelebrationSheet({ image, title, description, closeLabel, onClose, children, actions }: CelebrationSheetProps) {
  const colors = useThemeColors();
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button
            iconOnly
            variant="secondary"
            rounded="full"
            accessibilityLabel={closeLabel}
            onPress={() => {
              void Haptics.selectionAsync();
              onClose?.();
            }}
            style={SHEET_CLOSE_BUTTON_STYLE}
          >
            <X size={20} color={colors.textStrong} />
          </Button>
        </View>
        <View style={{ alignItems: 'center', gap: SHEET_SECTION_GAP }}>
          <Image source={image} style={{ width: 96, height: 96 }} resizeMode="contain" />
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text accessibilityRole="header" style={[TYPE.sheetTitle, { color: colors.textStrong, textAlign: 'center' }]}>
              {title}
            </Text>
            <Text style={[TYPE.body, { color: colors.textBase, textAlign: 'center' }]}>{description}</Text>
          </View>
        </View>
      </View>
      {children}
      <SheetActions style={{ gap: 12 }}>{actions}</SheetActions>
    </View>
  );
}

/** The body card inside a celebration sheet. */
export function CelebrationSheetCard({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        padding: 20,
        gap: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.strokeWeak,
        backgroundColor: colors.fillWeaker,
      }}
    >
      {children}
    </View>
  );
}
