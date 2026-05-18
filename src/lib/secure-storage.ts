import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Android SecureStore only allows alphanumeric characters, ".", "-", and "_"
const sanitizeKey = (key: string): string => {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const secureStorage = {
  async getItem(key: string, options?: SecureStore.SecureStoreOptions): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(sanitizeKey(key), options);
  },

  async setItem(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(sanitizeKey(key), value, options);
  },

  async deleteItem(key: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(sanitizeKey(key), options);
  },
};
