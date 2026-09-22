import type { IAuth, IUser } from '@/types';
import { storageKeys } from '@/constants/storage-keys';
import { secureStorage } from '@/lib/secure-storage';
import { clearPersistedQueryCache, queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { useUserStore } from '@/store/user.store';
import { useUiStore } from '@/store/ui.store';
import { useOfflineQueueStore } from '@/store/offline-queue.store';
import {
  deleteSessionCredentials,
  persistSessionCredentials,
  persistSessionUser,
  sanitizeUser,
} from './session-credentials';

export type TerminationReason = 'expired' | 'logout' | 'deleted' | 'restore-failed';

const IDENTITY_KEYS_ON_HARD_RESET = [
  storageKeys.biometricsEnabled,
  storageKeys.biometricsEmail,
  storageKeys.biometricsRefreshToken,
  storageKeys.passkeyCredentialId,
  storageKeys.passkeyEmail,
] as const;

let terminationPromise: Promise<void> | null = null;

export function syncAuthenticatedUser(user: IUser): IUser {
  const sanitized = sanitizeUser(user);
  const currentUser = useAuthStore.getState().user ?? useUserStore.getState().user;
  // Preserve local 'skipped' status if the server has not yet acknowledged the skip mutation
  if (
    currentUser?.onboarding_status === 'skipped' &&
    sanitized.onboarding_status === 'never'
  ) {
    sanitized.onboarding_status = 'skipped';
  }
  useUserStore.getState().setUser(sanitized);
  if (useAuthStore.getState().token) useAuthStore.getState().updateUser(sanitized);
  void persistSessionUser(sanitized, secureStorage);
  return sanitized;
}

export async function establishSession(credentials: IAuth, user: IUser): Promise<void> {
  const sanitized = sanitizeUser(user);
  useAuthStore.getState().beginAuthentication();
  await Promise.all([
    persistSessionCredentials(credentials, secureStorage),
    persistSessionUser(sanitized, secureStorage),
  ]);
  useAuthStore.getState().commitSession(credentials, sanitized);
  useUserStore.getState().setUser(sanitized);
  queryClient.setQueryData(queryKeys.profile, sanitized);
}

export async function commitRefreshedCredentials(credentials: IAuth): Promise<void> {
  await persistSessionCredentials(credentials, secureStorage);
  useAuthStore.getState().updateCredentials(credentials);
}

export async function restoreSessionWithCredentials(credentials: IAuth): Promise<void> {
  useAuthStore.getState().beginAuthentication();
  await persistSessionCredentials(credentials, secureStorage);
  useAuthStore.getState().updateCredentials(credentials);
}

export function terminateSession(reason: TerminationReason): Promise<void> {
  if (terminationPromise) return terminationPromise;

  // Remove runtime identity before any async storage work. The route guard can
  // now only observe a terminating/anonymous session, never stale credentials.
  useAuthStore.getState().beginTermination(reason);
  useUserStore.getState().clearUser();
  useUiStore.getState().closeSheet();
  if (reason !== 'expired') useUiStore.getState().setPendingDeepLink(null);

  terminationPromise = (async () => {
    try {
      const deletions = [
        deleteSessionCredentials(secureStorage),
        secureStorage.deleteItem(storageKeys.syncedPushToken),
        secureStorage.deleteItem(storageKeys.onboardingState),
        useOfflineQueueStore.getState().clearQueue(),
        clearPersistedQueryCache(),
      ];
      if (reason === 'deleted') {
        deletions.push(
          ...IDENTITY_KEYS_ON_HARD_RESET.map((key) => secureStorage.deleteItem(key)),
        );
      }
      await Promise.all(deletions);
      queryClient.clear();
    } finally {
      useAuthStore.getState().finishAnonymous();
      terminationPromise = null;
    }
  })();

  return terminationPromise;
}
