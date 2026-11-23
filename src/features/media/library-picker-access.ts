import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type LibraryAccess = ImagePicker.MediaLibraryPermissionResponse;

/** What the Android system photo picker "returns" for access: it needs none. */
export const PICKER_NEEDS_NO_PERMISSION: LibraryAccess = {
  status: ImagePicker.PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: 'never',
  accessPrivileges: 'all',
};

/**
 * Access check before `ImagePicker.launchImageLibraryAsync`.
 *
 * Android opens the system Photo Picker, which needs no storage or media
 * permission, and Memento declares none (Google Play photo and video
 * permissions policy). Asking would request undeclared permissions on
 * Android 12 and lower, which Android denies, so Android skips the request.
 * iOS keeps its photo library permission prompt.
 */
export async function requestLibraryPickerAccess(
  platform: string = Platform.OS,
  request: () => Promise<LibraryAccess> = ImagePicker.requestMediaLibraryPermissionsAsync,
): Promise<LibraryAccess> {
  if (platform === 'android') return PICKER_NEEDS_NO_PERMISSION;
  return request();
}
