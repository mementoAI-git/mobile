import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { createMementoClientHeaders } from './client-metadata';

export function getMementoClientHeaders() {
  const platform =
    Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
      ? Platform.OS
      : 'unknown';
  const build =
    platform === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : platform === 'android'
        ? Constants.expoConfig?.android?.versionCode
        : undefined;

  return createMementoClientHeaders({
    platform,
    version: Constants.expoConfig?.version,
    build,
  });
}
