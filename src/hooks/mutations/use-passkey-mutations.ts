import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Passkey } from 'react-native-passkey';
import { del, post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { storageKeys } from '@/constants/storage-keys';
import { useUserStore } from '@/store';

/** Shown in the passkey list on web and mobile, e.g. "iPhone 15 Pro". */
function getDeviceName(): string {
  return Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android device');
}

export function useRegisterPasskey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const begin = await post<any>(endpoint.passkeyRegisterBegin);
      // iOS: a platform key goes straight to Face ID / Touch ID and saves to iCloud Keychain,
      // skipping the security-key and other-device choices.
      const credential = Platform.OS === 'ios'
        ? await Passkey.createPlatformKey(begin.data)
        : await Passkey.create(begin.data);

      await post(endpoint.passkeyRegisterComplete, {
        // Match the browser's RegistrationResponseJSON (web uses @simplewebauthn/browser).
        response: { clientExtensionResults: {}, ...credential },
        device_name: getDeviceName(),
      });

      await SecureStore.setItemAsync(
        storageKeys.passkeyCredentialId,
        credential.id,
      );
      const email = useUserStore.getState().user?.email;
      if (email) {
        await SecureStore.setItemAsync(storageKeys.passkeyEmail, email);
      }

      await Promise.all([
        SecureStore.deleteItemAsync(storageKeys.biometricsRefreshToken),
        SecureStore.deleteItemAsync(storageKeys.biometricsEmail),
        SecureStore.deleteItemAsync(storageKeys.biometricsEnabled),
      ]);

      return credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passkeys });
    },
  });
}

export function useDeletePasskey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentialId: string) => del(
      endpoint.deletePasskey.replace(':credential_id', credentialId),
    ),
    onSuccess: async (_response, credentialId) => {
      const localCredentialId = await SecureStore.getItemAsync(
        storageKeys.passkeyCredentialId,
      );
      if (localCredentialId === credentialId) {
        await Promise.all([
          SecureStore.deleteItemAsync(storageKeys.passkeyCredentialId),
          SecureStore.deleteItemAsync(storageKeys.passkeyEmail),
        ]);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.passkeys });
    },
  });
}
