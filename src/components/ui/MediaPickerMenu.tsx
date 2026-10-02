/**
 * MediaPickerMenu — shared floating media-type picker
 *
 * Used in:
 *  - EditorActionBar (story + quick-capture editor)
 *  - ChatInput (chat screen attachment picker)
 *
 * Renders a horizontal row of icon+label tiles above the trigger button.
 * A transparent backdrop Pressable dismisses it on outside tap.
 */

import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import ImageIcon from 'lucide-react-native/icons/image';
import ImagePlus from 'lucide-react-native/icons/image-plus';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import Music from 'lucide-react-native/icons/music';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius } from '@/constants/responsive';

export interface MediaPickerMenuProps {
  visible: boolean;
  onClose: () => void;
  onGallery?: () => void;
  onCamera?: () => void;
  onVoice?: () => void;
  onFile?: () => void;
  /** Shows recording state on the Voice tile */
  isRecording?: boolean;
  /**
   * Left offset for the menu positioning — defaults to 12.
   * Pass a number matching the left position of your trigger button.
   */
  menuLeft?: number;
}

export function MediaPickerMenu({
  visible,
  onClose,
  onGallery,
  onCamera,
  onVoice,
  onFile,
  isRecording = false,
  menuLeft = 12,
}: MediaPickerMenuProps) {
  if (!visible) return null;

  const callAndClose = (fn?: () => void) => {
    onClose();
    fn?.();
  };

  return (
    <>
      {/* Transparent backdrop — tap anywhere outside to dismiss */}
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onClose(); }}
        style={styles.backdrop}
      />

      {/* Menu row */}
      <View style={[styles.menu, { marginLeft: menuLeft }]}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); callAndClose(onGallery); }}
          activeOpacity={0.8}
          style={styles.item}
        >
          <ImageIcon size={iconSize(18)} color={COLORS.textStrong} strokeWidth={1.8} />
          <Text style={styles.label}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); callAndClose(onCamera); }}
          activeOpacity={0.8}
          style={styles.item}
        >
          <ImagePlus size={iconSize(18)} color={COLORS.textStrong} strokeWidth={1.8} />
          <Text style={styles.label}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); callAndClose(onVoice); }}
          activeOpacity={0.8}
          style={[styles.item, isRecording && styles.itemRecording]}
        >
          <AudioLines size={iconSize(18)} color={isRecording ? COLORS.brand : COLORS.textStrong} strokeWidth={1.8} />
          <Text style={[styles.label, isRecording && styles.labelRecording]}>
            {isRecording ? 'Listening' : 'Voice'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); callAndClose(onFile); }}
          activeOpacity={0.8}
          style={styles.item}
        >
          <Music size={iconSize(18)} color={COLORS.textStrong} strokeWidth={1.8} />
          <Text style={styles.label}>File</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: -9999,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  menu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: radius(16),
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    marginBottom: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 200,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius(12),
    backgroundColor: COLORS.fillWeak,
    minWidth: 64,
  },
  itemRecording: {
    backgroundColor: COLORS.brandSubtle,
    borderWidth: 1,
    borderColor: `${COLORS.brand}20`,
  },
  label: {
    ...TYPE.metadata,
    color: COLORS.textStrong,
  },
  labelRecording: {
    color: COLORS.brand,
  },
});
