import { useMutation } from '@tanstack/react-query';
import { put } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { storageKeys } from '@/constants/storage-keys';
import { shouldSyncPushToken } from '@/features/notifications/work-policy';
import { secureStorage } from '@/lib/secure-storage';

export function useSyncPushToken() {
  return useMutation({
    mutationFn: async (token: string) => {
      const lastSyncedToken = await secureStorage.getItem(storageKeys.syncedPushToken);
      if (!shouldSyncPushToken(token, lastSyncedToken)) {
        return { synced: false };
      }

      await put(endpoint.profile, { push_token: token });
      await secureStorage.setItem(storageKeys.syncedPushToken, token);
      return { synced: true };
    },
  });
}
