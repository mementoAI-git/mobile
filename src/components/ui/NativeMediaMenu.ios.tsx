import React from 'react';
import { Button, Host, Image, Menu } from '@expo/ui/swift-ui';
import { background, disabled as disabledModifier, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { NativeMediaMenuProps } from './NativeMediaMenu.types';

/** The add-attachment button as the iOS system menu (SwiftUI `Menu`), used by the editor and chat. */
export function NativeMediaMenu({
  size, onGallery, onCamera, onVoice, onFile, isRecording = false, tone = 'filled', iconSize = 18, disabled = false,
}: NativeMediaMenuProps) {
  const COLORS = useThemeColors();
  const plain = tone === 'plain';
  return (
    <Host matchContents style={{ width: size, height: size, opacity: disabled ? 0.45 : 1 }}>
      <Menu
        modifiers={[disabledModifier(disabled)]}
        label={(
          <Image
            systemName="plus"
            size={iconSize}
            color={plain ? COLORS.textBase : COLORS.activeText}
            modifiers={plain
              ? [frame({ width: size, height: size })]
              : [frame({ width: size, height: size }), background(COLORS.activeFill, shapes.circle())]}
          />
        )}
      >
        <Button label="Gallery" systemImage="photo.on.rectangle" onPress={onGallery} />
        <Button label="Camera" systemImage="camera" onPress={onCamera} />
        <Button label={isRecording ? 'Listening' : 'Audio'} systemImage="waveform" onPress={onVoice} />
        <Button label="Files" systemImage="paperclip" onPress={onFile} />
      </Menu>
    </Host>
  );
}

export const HAS_NATIVE_MEDIA_MENU = true;
