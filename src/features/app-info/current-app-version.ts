import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import type { AppVersionInfo } from './app-version';

/** Reads the installed build and the running update from the device. */
export function currentAppVersion(): AppVersionInfo {
  return {
    version: Application.nativeApplicationVersion ?? null,
    build: Application.nativeBuildVersion ?? null,
    updateId: Updates.updateId ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch ?? true,
    channel: Updates.channel ?? null,
  };
}
