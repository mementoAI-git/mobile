import React from 'react';
import { Button, Host, Image, Menu } from '@expo/ui/swift-ui';
import { background, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { NativeMediaMenuProps } from './NativeMediaMenu.types';

/** The editor's add-attachment button as the iOS system menu (SwiftUI `Menu`). */
export function NativeMediaMenu({ size, onGallery, onCamera, onVoice, onFile, isRecording = false }: NativeMediaMenuProps) {
  const COLORS = useThemeColors();
  return (
    <Host matchContents style={{ width: size, height: size }}>
      <Menu
        label={(
          <Image
            systemName="plus"
            size={18}
            color={COLORS.activeText}
            modifiers={[frame({ width: size, height: size }), background(COLORS.activeFill, shapes.circle())]}
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
