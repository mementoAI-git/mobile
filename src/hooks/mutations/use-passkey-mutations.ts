import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Passkey } from 'react-native-passkey';
import { del, post } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { storageKeys } from '@/constants/storage-keys';
import { useUserStore } from '@/store';

function getDeviceName(): string {
  return Platform.OS === 'ios' ? 'Apple device' : 'Android device';
}

export function useRegisterPasskey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const begin = await post<any>(endpoint.passkeyRegisterBegin);
      const credential = await Passkey.create(begin.data);

      await post(endpoint.passkeyRegisterComplete, {
        response: credential,
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
