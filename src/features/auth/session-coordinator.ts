import type { IAuth, IUser } from '@/types';
import { storageKeys } from '@/constants/storage-keys';
import { secureStorage } from '@/lib/secure-storage';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { useUserStore } from '@/store/user.store';
import { useUiStore } from '@/store/ui.store';

export type TerminationReason = 'expired' | 'logout' | 'deleted' | 'restore-failed';

let terminationPromise: Promise<void> | null = null;

export async function establishSession(credentials: IAuth, user: IUser): Promise<void> {
  useAuthStore.getState().beginAuthentication();
  await secureStorage.setItem(storageKeys.auth, JSON.stringify(credentials));
  useAuthStore.getState().commitSession(credentials, user);
  useUserStore.getState().setUser(user);
  queryClient.setQueryData(queryKeys.profile, user);
}

export async function commitRefreshedCredentials(credentials: IAuth): Promise<void> {
  await secureStorage.setItem(storageKeys.auth, JSON.stringify(credentials));
  useAuthStore.getState().updateCredentials(credentials);
}

export async function restoreSessionWithCredentials(credentials: IAuth): Promise<void> {
  useAuthStore.getState().beginAuthentication();
  await secureStorage.setItem(storageKeys.auth, JSON.stringify(credentials));
  useAuthStore.getState().updateCredentials(credentials);
}

export function terminateSession(reason: TerminationReason): Promise<void> {
  if (terminationPromise) return terminationPromise;

  // Remove runtime identity before any async storage work. The route guard can
  // now only observe a terminating/anonymous session, never stale credentials.
  useAuthStore.getState().beginTermination();
  useUserStore.getState().clearUser();
  if (reason !== 'expired') useUiStore.getState().setPendingDeepLink(null);

  terminationPromise = (async () => {
    try {
      await Promise.all([
        secureStorage.deleteItem(storageKeys.auth),
        secureStorage.deleteItem(storageKeys.syncedPushToken),
      ]);
      queryClient.clear();
    } finally {
      useAuthStore.getState().finishAnonymous();
      terminationPromise = null;
    }
  })();

  return terminationPromise;
}
