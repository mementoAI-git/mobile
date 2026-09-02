import { storageKeys } from '@/constants/storage-keys';

interface PushStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
}

type PushPlatform = 'ios' | 'android' | 'web';

interface InstallationIdDependencies {
  storage: PushStorage;
  platform: PushPlatform;
  now?: () => number;
  random?: () => number;
}

export function createInstallationIdManager({
  storage,
  platform,
  now = Date.now,
  random = Math.random,
}: InstallationIdDependencies) {
  let pending: Promise<string> | null = null;

  async function resolveInstallationId() {
    const existing = await storage.getItem(storageKeys.installationId);
    if (existing) return existing;

    const installationId = [
      'memento',
      platform,
      now().toString(36),
      random().toString(36).slice(2, 14),
    ].join('-');
    await storage.setItem(storageKeys.installationId, installationId);
    return installationId;
  }

  return {
    getInstallationId() {
      if (!pending) {
        pending = resolveInstallationId().finally(() => {
          pending = null;
        });
      }
      return pending;
    },
  };
}

interface SyncPushDeviceDependencies {
  storage: PushStorage;
  getInstallationId: () => Promise<string>;
  platform: PushPlatform;
  register: (
    installationId: string,
    payload: { platform: PushPlatform; push_token: string },
  ) => Promise<unknown>;
  registerLegacy: (token: string) => Promise<unknown>;
}

export async function syncPushDevice(
  token: string,
  dependencies: SyncPushDeviceDependencies,
) {
  const installationId = await dependencies.getInstallationId();
  const lastSyncedToken = await dependencies.storage.getItem(
    storageKeys.syncedPushToken,
  );
  if (lastSyncedToken === token) {
    return { synced: false, installationId, legacy: false };
  }

  let legacy = false;
  try {
    await dependencies.register(installationId, {
      platform: dependencies.platform,
      push_token: token,
    });
  } catch (error) {
    const status =
      typeof error === 'object' && error !== null
        ? (error as { httpStatus?: number; status?: number }).httpStatus ??
          (error as { status?: number }).status
        : undefined;
    if (status !== 404) throw error;
    await dependencies.registerLegacy(token);
    legacy = true;
  }

  await dependencies.storage.setItem(storageKeys.syncedPushToken, token);
  return { synced: true, installationId, legacy };
}
