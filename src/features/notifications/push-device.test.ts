// @ts-nocheck
import { expect, mock, test } from 'bun:test';
import { createInstallationIdManager, syncPushDevice } from './push-device';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: mock(async (key) => data.get(key) ?? null),
    setItem: mock(async (key, value) => void data.set(key, value)),
    deleteItem: mock(async (key) => void data.delete(key)),
  };
}

test('creates one durable installation identity', async () => {
  const storage = memoryStorage();
  const manager = createInstallationIdManager({
    storage,
    platform: 'ios',
    now: () => 1_700_000_000_000,
    random: () => 0.123456,
  });

  const first = await manager.getInstallationId();
  const second = await manager.getInstallationId();
  expect(first).toBe(second);
  expect(first).toStartWith('memento-ios-');
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});

test('registers by installation and skips an unchanged token', async () => {
  const storage = memoryStorage();
  const register = mock(async () => undefined);
  const deps = {
    storage,
    getInstallationId: async () => 'installation-1',
    platform: 'android',
    register,
    registerLegacy: mock(async () => undefined),
  };

  await expect(syncPushDevice('ExponentPushToken[new]', deps)).resolves.toEqual({
    synced: true,
    installationId: 'installation-1',
    legacy: false,
  });
  await expect(syncPushDevice('ExponentPushToken[new]', deps)).resolves.toEqual({
    synced: false,
    installationId: 'installation-1',
    legacy: false,
  });
  expect(register).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledWith('installation-1', {
    platform: 'android',
    push_token: 'ExponentPushToken[new]',
  });
});

test('falls back to the legacy profile bridge only when the device route is absent', async () => {
  const storage = memoryStorage();
  const registerLegacy = mock(async () => undefined);

  const result = await syncPushDevice('ExponentPushToken[legacy]', {
    storage,
    getInstallationId: async () => 'installation-1',
    platform: 'ios',
    register: async () => {
      throw { httpStatus: 404 };
    },
    registerLegacy,
  });

  expect(result.legacy).toBe(true);
  expect(registerLegacy).toHaveBeenCalledWith('ExponentPushToken[legacy]');
});
