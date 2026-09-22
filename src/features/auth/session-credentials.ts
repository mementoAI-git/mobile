import type { IAuth, IUser } from '@/types';
import { storageKeys } from '@/constants/storage-keys';
import type { AuthStorage } from './auth-state';

export function sanitizeUser<T extends IUser | (Partial<IUser> & Record<string, unknown>)>(user: T): T {
  const next = { ...user };
  if ('password' in next) next.password = '' as T['password'];
  if ('private_key' in next) next.private_key = '' as T['private_key'];
  if (next.two_factor && typeof next.two_factor === 'object') {
    next.two_factor = { ...next.two_factor, secret: '' };
  }
  return next;
}

function parseAuthBlob(raw: string | null): IAuth | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as IAuth;
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isCombinedBlob(value: string | null): boolean {
  return Boolean(value && value.trim().startsWith('{'));
}

export async function persistSessionCredentials(
  credentials: IAuth,
  storage: AuthStorage,
): Promise<void> {
  const metadata = {
    access_expires_at: credentials.access_expires_at,
    expires_at: credentials.expires_at,
    refresh_expires_at: credentials.refresh_expires_at,
    onboarding_status: credentials.onboarding_status,
  };

  await Promise.all([
    storage.setItem(storageKeys.authAccessToken, credentials.access_token),
    storage.setItem(storageKeys.authRefreshToken, credentials.refresh_token),
    storage.setItem(storageKeys.auth, JSON.stringify(metadata)),
  ]);
}

export async function readSessionCredentials(
  storage: AuthStorage,
): Promise<IAuth | null> {
  const [access, refresh, rawMeta] = await Promise.all([
    storage.getItem(storageKeys.authAccessToken),
    storage.getItem(storageKeys.authRefreshToken),
    storage.getItem(storageKeys.auth),
  ]);

  if (access && refresh && !isCombinedBlob(access) && !isCombinedBlob(refresh)) {
    let metadata: Partial<IAuth> = {};
    if (rawMeta) {
      try {
        metadata = JSON.parse(rawMeta) as Partial<IAuth>;
      } catch {
        metadata = {};
      }
    }
    const accessExpiresAt = metadata.access_expires_at || metadata.expires_at || '';
    return {
      access_token: access,
      refresh_token: refresh,
      access_expires_at: accessExpiresAt,
      expires_at: accessExpiresAt,
      refresh_expires_at: metadata.refresh_expires_at ?? '',
      ...(metadata.onboarding_status
        ? { onboarding_status: metadata.onboarding_status }
        : {}),
    };
  }

  const legacy = parseAuthBlob(rawMeta);
  if (!legacy) return null;
  await persistSessionCredentials(legacy, storage);
  return legacy;
}

export async function persistSessionUser(
  user: IUser,
  storage: AuthStorage,
): Promise<void> {
  const sanitized = sanitizeUser(user);
  await storage.setItem(storageKeys.sessionUser, JSON.stringify(sanitized));
}

export async function readSessionUser(
  storage: AuthStorage,
): Promise<IUser | null> {
  const raw = await storage.getItem(storageKeys.sessionUser);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as IUser;
    return parsed && typeof parsed === 'object' && parsed._id ? sanitizeUser(parsed) : null;
  } catch {
    return null;
  }
}

export async function deleteSessionCredentials(storage: AuthStorage): Promise<void> {
  await Promise.all([
    storage.deleteItem(storageKeys.authAccessToken),
    storage.deleteItem(storageKeys.authRefreshToken),
    storage.deleteItem(storageKeys.auth),
    storage.deleteItem(storageKeys.sessionUser),
  ]);
}
