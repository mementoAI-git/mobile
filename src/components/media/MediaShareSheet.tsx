import React, { useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share2 from 'lucide-react-native/icons/share-2';
import Link2 from 'lucide-react-native/icons/link-2';
import Download from 'lucide-react-native/icons/download';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SheetHeader } from '@/components/sheets/SheetHeader';
import { useSheetChrome } from '@/components/sheets/use-sheet-chrome';
import { getSheetActionsBottomPadding, SHEET_GROUP_GAP } from '@/features/layout/sheet-safe-area';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface MediaShareSheetProps {
  visible: boolean;
  onClose: () => void;
  onShareLink?: () => void;
  onShareFile: () => void;
  onSave: () => void;
  saveTitle: string;
  saveDescription: string;
}

/**
 * The media viewer's share options on the shared bottom sheet (chrome, header,
 * backdrop and bottom spacing), like every other sheet in the app. It renders
 * inside the viewer's own BottomSheetModalProvider, since the viewer is a
 * native modal window above the app's SheetManager.
 */
export function MediaShareSheet({ visible, onClose, onShareLink, onShareFile, onSave, saveTitle, saveDescription }: MediaShareSheetProps) {
  const ref = useRef<BottomSheetModal>(null);
  const chrome = useSheetChrome();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const share = <Row key="share" icon={Share2} title="Share file" description="Send via message, email or another app" onPress={onShareFile} />;
  const save = <Row key="save" icon={Download} title={saveTitle} description={saveDescription} onPress={onSave} />;

  return (
    <BottomSheetModal ref={ref} {...chrome.props} enableDynamicSizing enablePanDownToClose onDismiss={onClose}>
      <BottomSheetView style={{ minHeight: chrome.minContentHeight, paddingHorizontal: 20, paddingBottom: getSheetActionsBottomPadding(insets.bottom), gap: SHEET_GROUP_GAP }}>
        <SheetHeader title="Share" onClose={onClose} closeLabel="Close share options" />
        <View style={{ gap: 4 }}>
          {onShareLink ? <Row icon={Link2} title="Share memory link" description="Copy and share the public link" onPress={onShareLink} /> : null}
          {Platform.OS === 'ios' ? [share, save] : [save, share]}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function Row({ icon: Icon, title, description, onPress }: {
  icon: typeof Share2;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, minHeight: 64 }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.fillWeak, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={colors.textBase} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...TYPE.body, color: colors.textStrong }}>{title}</Text>
        <Text style={{ ...TYPE.bodySmall, color: colors.textWeak }}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}
