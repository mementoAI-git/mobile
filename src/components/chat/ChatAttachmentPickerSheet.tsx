import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { forwardRef, useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Camera from 'lucide-react-native/icons/camera';
import FileText from 'lucide-react-native/icons/file-text';
import Film from 'lucide-react-native/icons/film';
import ImageIcon from 'lucide-react-native/icons/image';
import Music from 'lucide-react-native/icons/music';
import { SheetHeader } from '@/components/sheets/SheetHeader';
import { SheetActions, SHEET_FILL } from '@/components/sheets/SheetActions';
import { SHEET_GROUP_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { type ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize } from '@/constants/responsive';
import { toast } from '@/components/ui/Toast';
import { MAX_ATTACHMENT_FILE_MB } from '@/features/media/attachments';
import {
  pickChatLibraryAssets,
  type ChatLibraryPick,
  type ChatPickerAsset,
} from '@/features/media/picker-assets';
import { useSheetChrome } from '@/components/sheets/use-sheet-chrome';

export type { ChatPickerAsset };

interface ChatAttachmentPickerSheetProps {
  onCamera: () => void;
  onDocs: () => void;
  onAudio?: () => void;
  onConfirm: (assets: ChatPickerAsset[]) => void;
}

const SHEET_HORIZONTAL = 20;

/**
 * Attach media in chat (Android and web; iOS uses the system menu in ChatInput).
 *
 * Photos and videos come from the system photo picker (the Android Photo
 * Picker on Android 13+, or its Play services backport), which returns only
 * what the person picks. Memento never reads the whole library, so it needs no
 * READ_MEDIA_IMAGES / READ_MEDIA_VIDEO permission.
 */
export const ChatAttachmentPickerSheet = forwardRef<BottomSheetModal, ChatAttachmentPickerSheetProps>(
  function ChatAttachmentPickerSheet({ onCamera, onDocs, onAudio, onConfirm }, ref) {
    const COLORS = useThemeColors();
    const sheetChrome = useSheetChrome();
    const styles = useThemeStyles(createStyles);
    const insets = useSafeAreaInsets();
    const pickingRef = useRef(false);

    const dismiss = useCallback(() => {
      if (typeof ref !== 'function') ref?.current?.dismiss();
    }, [ref]);

    const openLibrary = useCallback(async (kind: ChatLibraryPick) => {
      if (pickingRef.current) return;
      pickingRef.current = true;
      dismiss();
      try {
        const { assets, oversizedCount } = await pickChatLibraryAssets(kind, ImagePicker.launchImageLibraryAsync);
        if (oversizedCount > 0) toast(`Videos must be ${MAX_ATTACHMENT_FILE_MB} MB or smaller.`, 'error');
        if (assets.length > 0) onConfirm(assets);
      } catch {
        toast('Your gallery did not open. Please try again.', 'error');
      } finally {
        pickingRef.current = false;
      }
    }, [dismiss, onConfirm]);

    const handleGallery = useCallback(() => {
      Haptics.selectionAsync();
      openLibrary('media');
    }, [openLibrary]);

    // The shared Button fires its own haptic.
    const handleGalleryButton = useCallback(() => {
      openLibrary('media');
    }, [openLibrary]);

    const handleVideos = useCallback(() => {
      Haptics.selectionAsync();
      openLibrary('videos');
    }, [openLibrary]);

    const handleCamera = useCallback(() => {
      Haptics.selectionAsync();
      dismiss();
      onCamera();
    }, [dismiss, onCamera]);

    const handleDocs = useCallback(() => {
      Haptics.selectionAsync();
      dismiss();
      onDocs();
    }, [dismiss, onDocs]);

    const handleAudio = useCallback(() => {
      Haptics.selectionAsync();
      dismiss();
      onAudio?.();
    }, [dismiss, onAudio]);

    return (
      <BottomSheetModal
        ref={ref}
        {...sheetChrome.props}
        enablePanDownToClose
      >
        <BottomSheetView
          style={[
            styles.container,
            { minHeight: sheetChrome.minContentHeight, paddingBottom: getSheetActionsBottomPadding(insets.bottom) },
          ]}
        >
          <SheetHeader
            title="Attach media"
            onClose={dismiss}
            closeLabel="Close attachment picker"
            style={styles.header}
          />

          <View style={styles.actionRow}>
            <PickerAction
              label="Camera"
              icon={<Camera size={20} color={COLORS.textBase} strokeWidth={1.8} />}
              onPress={handleCamera}
            />
            <PickerAction
              label="Gallery"
              icon={<ImageIcon size={20} color={COLORS.textBase} strokeWidth={1.8} />}
              onPress={handleGallery}
            />
            <PickerAction
              label="Videos"
              icon={<Film size={20} color={COLORS.textBase} strokeWidth={1.8} />}
              onPress={handleVideos}
            />
            {onAudio ? (
              <PickerAction
                label="Audio"
                icon={<Music size={20} color={COLORS.textBase} strokeWidth={1.8} />}
                onPress={handleAudio}
              />
            ) : null}
            <PickerAction
              label="Docs"
              icon={<FileText size={20} color={COLORS.textBase} strokeWidth={1.8} />}
              onPress={handleDocs}
            />
          </View>

          <TouchableOpacity
            onPress={handleGallery}
            activeOpacity={0.86}
            style={styles.galleryPanel}
            accessibilityRole="button"
            accessibilityLabel="Choose photos and videos"
          >
            <View style={styles.galleryIcon}>
              <ImageIcon size={iconSize(24)} color={COLORS.brand} strokeWidth={1.8} />
            </View>
            <Text style={styles.galleryTitle}>Choose photos and videos</Text>
            <Text style={styles.galleryText}>
              Pick from your gallery. Memento only sees what you choose. Videos up to {MAX_ATTACHMENT_FILE_MB} MB.
            </Text>
          </TouchableOpacity>

          <SheetActions style={styles.actions}>
            <View style={styles.actionsRow}>
              <View style={styles.dismissSlot}>
                <Button variant="outline" size="lg" rounded="full" fullWidth onPress={dismiss}>
                  Dismiss
                </Button>
              </View>
              <View style={styles.openSlot}>
                <Button size="lg" rounded="full" fullWidth onPress={handleGalleryButton}>
                  Open gallery
                </Button>
              </View>
            </View>
          </SheetActions>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

// ─── Picker action tile ───────────────────────────────────────────────────────

function PickerAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.actionTile}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon}
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: {
    ...SHEET_FILL,
    backgroundColor: COLORS.sheet,
  },
  header: {
    paddingHorizontal: SHEET_HORIZONTAL,
    marginBottom: SHEET_GROUP_GAP,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: SHEET_HORIZONTAL,
    gap: 8,
  },
  actionTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: COLORS.fillWeaker,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    gap: 5,
    minHeight: 64,
  },
  actionLabel: {
    ...TYPE.eyebrow,
    color: COLORS.textWeak,
    textAlign: 'center',
  },
  galleryPanel: {
    marginTop: 24,
    marginHorizontal: SHEET_HORIZONTAL,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.fillWeaker,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  galleryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: COLORS.brandSubtle,
  },
  galleryTitle: {
    ...TYPE.label,
    color: COLORS.textStrong,
    textAlign: 'center',
  },
  galleryText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
    textAlign: 'center',
  },
  actions: {
    paddingTop: SHEET_GROUP_GAP,
    paddingHorizontal: SHEET_HORIZONTAL,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dismissSlot: {
    flex: 1,
  },
  openSlot: {
    flex: 2,
  },
});
