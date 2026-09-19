import { Platform } from 'react-native';
import endpoint from '@/api/endpoint';
import { del, put } from '@/api/mutations';
import { secureStorage } from '@/lib/secure-storage';
import { createInstallationIdManager, syncPushDevice } from './push-device';

const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
const installationIds = createInstallationIdManager({
  storage: secureStorage,
  platform,
});

export function syncCurrentPushDevice(token: string) {
  return syncPushDevice(token, {
    storage: secureStorage,
    getInstallationId: installationIds.getInstallationId,
    platform,
    register: (installationId, payload) =>
      put(`${endpoint.pushDevices}/${encodeURIComponent(installationId)}`, payload),
    registerLegacy: (legacyToken) => put(endpoint.profile, { push_token: legacyToken }),
  });
}

export async function disableCurrentPushDevice() {
  const installationId = await installationIds.getInstallationId();
  return del(`${endpoint.pushDevices}/${encodeURIComponent(installationId)}`, {
    timeout: 2000,
  });
}
