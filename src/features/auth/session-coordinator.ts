
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
import { signOutIdentityProviders } from './identity-provider-sign-out';
import { post } from '@/api/mutations';
import { getOnboardingUserAccountId } from '@/features/onboarding/onboarding-completion';
import endpoint from '@/api/endpoint';
import {
  reconcileOnboardingSkipMarker,
  type PendingOnboardingSkip,
} from './onboarding-skip-retry';

export type TerminationReason = 'expired' | 'logout' | 'deleted' | 'restore-failed';

const IDENTITY_KEYS_ON_HARD_RESET = [
  storageKeys.biometricsEnabled,
  storageKeys.biometricsEmail,
  storageKeys.biometricsRefreshToken,
  storageKeys.passkeyCredentialId,
  storageKeys.passkeyEmail,
] as const;

let terminationPromise: Promise<void> | null = null;
let skipRetryPending = false;

interface SkipRetryDependencies {
  storage?: typeof secureStorage;
  submitSkip?: () => Promise<unknown>;
}

function userIdentity(user: IUser): string {
  return String(user._id ?? '');
}

async function savePendingOnboardingSkip(user: IUser): Promise<void> {
  const marker: PendingOnboardingSkip = {
    userId: userIdentity(user),
    createdAt: new Date().toISOString(),
  };
  await secureStorage.setItem(
    storageKeys.pendingOnboardingSkip,
    JSON.stringify(marker),
  );
}

export async function reconcilePendingOnboardingSkip(
  user: IUser,
  dependencies: SkipRetryDependencies = {},
): Promise<void> {
  const storage = dependencies.storage ?? secureStorage;
  const submitSkip =
    dependencies.submitSkip ?? (() => post(endpoint.onboardingSkip, {}));
  await reconcileOnboardingSkipMarker(user, storage, submitSkip);
}

export function syncAuthenticatedUser(user: IUser): IUser {
  const sanitized = sanitizeUser(user);
  const currentUser = useAuthStore.getState().user ?? useUserStore.getState().user;
  // If user skipped onboarding locally while offline, reconcile and sync with the server
  if (
    currentUser?.onboarding_status === 'skipped' &&
    sanitized.onboarding_status === 'never'
  ) {
    sanitized.onboarding_status = 'skipped';
    void savePendingOnboardingSkip(currentUser);
    if (!skipRetryPending) {
      skipRetryPending = true;
      post(endpoint.onboardingSkip, {})
        .then(() => secureStorage.deleteItem(storageKeys.pendingOnboardingSkip))
        .catch(() => { })
        .finally(() => {
          skipRetryPending = false;
        });
    }
  }
  // A profile request started before onboarding finished can land after it
  // with "never"; keeping it would route the user back into onboarding.
  if (
    currentUser?.onboarding_status === 'completed' &&
    sanitized.onboarding_status === 'never' &&
    getOnboardingUserAccountId(currentUser) === getOnboardingUserAccountId(sanitized)
  ) {
    sanitized.onboarding_status = 'completed';
    sanitized.onboarded = true;
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
        secureStorage.deleteItem(storageKeys.pendingOnboardingSkip),
        useOfflineQueueStore.getState().clearQueue(),
        clearPersistedQueryCache(),
        signOutIdentityProviders(),
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
