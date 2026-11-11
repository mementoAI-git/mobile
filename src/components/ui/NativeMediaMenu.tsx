import type { NativeMediaMenuProps } from './NativeMediaMenu.types';

/** The iOS system menu lives in NativeMediaMenu.ios.tsx; other platforms keep MediaPickerMenu. */
export function NativeMediaMenu(_props: NativeMediaMenuProps) {
  return null;
}

export const HAS_NATIVE_MEDIA_MENU = false;
