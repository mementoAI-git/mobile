// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const modal = readFileSync('src/components/ui/MediaPreviewModal.tsx', 'utf8');

describe('Media preview modal', () => {
  test('uses a functional Expo Go export fallback and visible save failures instead of native alerts', () => {
    expect(modal).toContain("toast('Use the share menu to save this file.', 'info')");
    expect(modal).toContain('await Share.share({ url: localUri, message: item.name })');
    expect(modal).toContain("toast('Could not save media. Please try again in a moment.', 'error')");
    expect(modal).not.toContain('Alert.alert(');
  });

  test('keeps gallery-save permission recovery flow intact', () => {
    expect(modal).toContain('showPermissionRecoveryAlert');
    expect(modal).toContain('MediaLibrary.requestPermissionsAsync()');
    expect(modal).toContain('MediaLibrary.saveToLibraryAsync');
    expect(modal).toContain("import type * as MediaLibraryType from 'expo-media-library/legacy'");
    expect(modal).toContain("return require('expo-media-library/legacy') as typeof MediaLibraryType;");
  });

  test('adapts save or export labels by platform and media type', () => {
    expect(modal).toContain('const currentItemIsVisual = !!currentItem && (');
    expect(modal).toContain("? Platform.OS === 'ios' ? 'Save to Photos' : 'Save to Gallery'");
    expect(modal).toContain(": Platform.OS === 'ios' ? 'Save to Files' : 'Download file';");
    expect(modal).toContain("? Platform.OS === 'ios' ? 'Save this to your photo library' : 'Save this to your gallery'");
    expect(modal).toContain(": Platform.OS === 'ios' ? 'Open the share sheet to save a copy to Files' : 'Export a copy using apps on your device';");
    expect(modal).toContain("? Platform.OS === 'ios' ? 'Saved to Photos' : 'Saved to Gallery'");
    expect(modal).toContain(": Platform.OS === 'ios' ? 'Saved to Files' : 'File downloaded';");
  });

  test('downloads remote files before invoking the share sheet for file export', () => {
    expect(modal).toContain("if (item.uri.startsWith('http')) {");
    expect(modal).toContain('const downloadDest = `${FileSystem.cacheDirectory}${filename}`;');
    expect(modal).toContain('await Share.share({ url: localUri, message: item.name });');
    expect(modal).toContain('const handleSaveOrExport = useCallback(async () => {');
    expect(modal).toContain('if (!currentItemIsVisual) {');
    expect(modal).toContain("toast(saveSuccessMessage, 'success');");
  });

  test('supports backend-first and mobile-fallback audio artwork in preview attachments', () => {
    const player = readFileSync('src/components/audio/TranscriptAudioPlayer.tsx', 'utf8');
    expect(modal).toContain('thumbnailUrl?: string | null;');
    expect(modal).toContain('thumbnailUrl={item.thumbnailUrl}');
    expect(player).toContain("import { useResolvedAudioArtworkThumbnail } from '@/features/media/audio-artwork';");
    expect(player).toContain('backendThumbnail: thumbnailUrl,');
    expect(player).toContain('source={{ uri: artworkUri }}');
  });

  test('uses a low-frequency polling cadence for active media to avoid unnecessary heat generation', () => {
    expect(modal).toContain('const id = setInterval(() => {');
    expect(modal).toContain('}, 1000);');
    expect(modal).toContain('if (!isActive) return undefined;');
  });

  test('does not keep a chat pulse animation alive outside active streaming', () => {
    const chatScreen = readFileSync('src/screens/ChatScreen.tsx', 'utf8');
    expect(chatScreen).toContain('if (!isActuallyStreaming) return null;');
    expect(chatScreen).not.toContain('withRepeat(');
  });

  test('plays audio through the transcript player, driven by player status events', () => {
    const player = readFileSync('src/components/audio/TranscriptAudioPlayer.tsx', 'utf8');
    expect(modal).toContain('<TranscriptAudioPlayer');
    expect(modal).toContain('fileId={item.persistedFileId}');
    expect(player).toContain('useAudioPlayerStatus(player)');
    expect(player).not.toContain('setInterval(');
    expect(player).not.toContain('withRepeat(');
  });
});
