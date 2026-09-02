import { useMutation } from '@tanstack/react-query';
import { syncCurrentPushDevice } from '@/features/notifications/push-device-runtime';

export function useSyncPushToken() {
  return useMutation({
    mutationFn: syncCurrentPushDevice,
  });
}
