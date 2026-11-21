import { describe, expect, mock, test } from 'bun:test';

mock.module('expo-image-picker', () => ({
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  requestMediaLibraryPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: true, expires: 'never' }),
}));

const { requestLibraryPickerAccess } = await import('./library-picker-access');

describe('library picker access', () => {
  test('Android opens the system photo picker without asking for media permissions', async () => {
    let asked = false;
    const access = await requestLibraryPickerAccess('android', async () => {
      asked = true;
      return { status: 'denied', granted: false, canAskAgain: true, expires: 'never' } as any;
    });
    expect(asked).toBe(false);
    expect(access.granted).toBe(true);
    expect(String(access.status)).toBe('granted');
  });

  test('iOS keeps the photo library permission request', async () => {
    const denied = { status: 'denied', granted: false, canAskAgain: false, expires: 'never' } as any;
    expect(await requestLibraryPickerAccess('ios', async () => denied)).toBe(denied);
  });
});
