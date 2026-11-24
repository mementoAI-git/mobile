import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

/**
 * Google Play's photo and video permissions policy: Memento only needs one-off
 * picks, so it uses the system Photo Picker and never asks for broad media
 * access. Blocking the permissions also strips them when a library (for
 * example expo-media-library) declares them in its own manifest.
 */
const android = JSON.parse(readFileSync('app.json', 'utf8')).expo.android as {
  permissions: string[];
  blockedPermissions?: string[];
};

const BLOCKED = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE',
];

describe('Android media permissions', () => {
  test.each(BLOCKED)('%s is not requested and is blocked', (permission) => {
    expect(android.permissions).not.toContain(permission);
    expect(android.blockedPermissions ?? []).toContain(permission);
  });

  // Expo's Android template adds "display over other apps"; Memento never
  // draws over other apps, and Play flags the permission.
  test('SYSTEM_ALERT_WINDOW is blocked', () => {
    expect(android.permissions).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
    expect(android.blockedPermissions ?? []).toContain('android.permission.SYSTEM_ALERT_WINDOW');
  });

  test('WRITE_EXTERNAL_STORAGE is not requested by the app itself', () => {
    // expo-media-library and expo-image-picker declare it with maxSdkVersion 32:
    // saving to the gallery on Android 12 and lower and camera capture on
    // Android 9 and lower check for it. It is not part of the photo and video policy.
    expect(android.permissions).not.toContain('android.permission.WRITE_EXTERNAL_STORAGE');
    expect(android.blockedPermissions ?? []).not.toContain('android.permission.WRITE_EXTERNAL_STORAGE');
  });

  test('keeps the permissions the app needs', () => {
    for (const permission of [
      'CAMERA',
      'RECORD_AUDIO',
      'MODIFY_AUDIO_SETTINGS',
      'POST_NOTIFICATIONS',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'FOREGROUND_SERVICE_MICROPHONE',
    ]) {
      expect(android.permissions).toContain(`android.permission.${permission}`);
    }
  });

  test('no screen reads the media library', () => {
    const sheet = readFileSync('src/components/chat/ChatAttachmentPickerSheet.tsx', 'utf8');
    const preview = readFileSync('src/components/ui/MediaPreviewModal.tsx', 'utf8');
    expect(sheet).not.toContain('getAssetsAsync');
    expect(sheet).not.toContain('getAssetInfoAsync');
    expect(preview).toContain('MediaLibrary.requestPermissionsAsync(true)');
  });
});
