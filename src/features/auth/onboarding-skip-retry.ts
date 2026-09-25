import type {IUser} from '@/types';
import {storageKeys} from '@/constants/storage-keys';

export interface SkipRetryStorage {
  getItem(key: string): Promise<string | null>;
  deleteItem(key: string): Promise<void>;
}

export interface PendingOnboardingSkip {
  userId: string;
  createdAt: string;
}

let retryPending = false;

function userIdentity(user: IUser): string {
  return String(user._id ?? '');
}

export async function reconcileOnboardingSkipMarker(
  user: IUser,
  storage: SkipRetryStorage,
  submitSkip: () => Promise<unknown>,
): Promise<void> {
  if (retryPending) return;
  const raw = await storage.getItem(storageKeys.pendingOnboardingSkip);
  if (!raw) return;
  let marker: PendingOnboardingSkip | null = null;
  try {
    const parsed = JSON.parse(raw) as PendingOnboardingSkip;
    if (parsed?.userId) marker = parsed;
  } catch {
    if (raw === 'true') {
      marker = {userId: userIdentity(user), createdAt: new Date().toISOString()};
    }
  }
  if (!marker || marker.userId !== userIdentity(user)) {
    await storage.deleteItem(storageKeys.pendingOnboardingSkip);
    return;
  }
  if (user.onboarding_status === 'skipped' || user.onboarding_status === 'completed') {
    await storage.deleteItem(storageKeys.pendingOnboardingSkip);
    return;
  }
  retryPending = true;
  try {
    await submitSkip();
    await storage.deleteItem(storageKeys.pendingOnboardingSkip);
  } catch {
    // Keep the durable marker for the next authenticated launch.
  } finally {
    retryPending = false;
  }
}