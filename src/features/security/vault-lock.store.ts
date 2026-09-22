import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { storageKeys } from '@/constants/storage-keys';

interface VaultLockState {
  isLocked: boolean;
  lockTimeoutMinutes: number; // -1: disabled, 0: immediate, 1: 1m, 5: 5m, 15: 15m
  lastBackgroundTime: number | null;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  setLockTimeout: (minutes: number) => Promise<void>;
  recordBackground: () => void;
  checkResumeLock: () => boolean;
  unlockVault: () => Promise<boolean>;
}

export const useVaultLockStore = create<VaultLockState>((set, get) => ({
  isLocked: false,
  lockTimeoutMinutes: -1,
  lastBackgroundTime: null,
  isInitialized: false,

  initialize: async () => {
    try {
      const storedTimeout = await SecureStore.getItemAsync(storageKeys.vaultLockTimeout);
      const minutes = storedTimeout !== null ? parseInt(storedTimeout, 10) : -1;
      set({ lockTimeoutMinutes: isNaN(minutes) ? -1 : minutes, isInitialized: true });
    } catch {
      set({ isInitialized: true });
    }
  },

  setLockTimeout: async (minutes: number) => {
    try {
      await SecureStore.setItemAsync(storageKeys.vaultLockTimeout, minutes.toString());
      if (minutes >= 0) {
        // Ensure secret exists for biometric challenge
        await SecureStore.setItemAsync(storageKeys.vaultLockSecret, 'memento_authenticated', {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to enable Vault Lock',
        });
      }
      set({ lockTimeoutMinutes: minutes });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Revert if biometric enrollment failed or cancelled
      set({ lockTimeoutMinutes: -1 });
      await SecureStore.deleteItemAsync(storageKeys.vaultLockTimeout).catch(() => {});
    }
  },

  recordBackground: () => {
    const { lockTimeoutMinutes } = get();
    if (lockTimeoutMinutes >= 0) {
      set({ lastBackgroundTime: Date.now() });
      if (lockTimeoutMinutes === 0) {
        set({ isLocked: true });
      }
    }
  },

  checkResumeLock: () => {
    const { lockTimeoutMinutes, lastBackgroundTime } = get();
    if (lockTimeoutMinutes < 0) return false;
    if (lockTimeoutMinutes === 0) {
      set({ isLocked: true });
      return true;
    }
    if (lastBackgroundTime) {
      const elapsedMs = Date.now() - lastBackgroundTime;
      const thresholdMs = lockTimeoutMinutes * 60 * 1000;
      if (elapsedMs >= thresholdMs) {
        set({ isLocked: true });
        return true;
      }
    }
    return false;
  },

  unlockVault: async () => {
    try {
      const result = await SecureStore.getItemAsync(storageKeys.vaultLockSecret, {
        requireAuthentication: true,
        authenticationPrompt: 'Unlock your Memento personal vault',
      });

      if (result !== null) {
        set({ isLocked: false, lastBackgroundTime: null });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
