import { useEffect } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useSyncPushToken } from '@/hooks/mutations/use-push-token-mutation';
import { logger } from '@/lib/logger';

export function AuthenticatedNotificationManager() {
  const { expoPushToken } = useNotifications();
  const { mutate: syncPushToken } = useSyncPushToken();

  useEffect(() => {
    if (!expoPushToken) return;

    syncPushToken(expoPushToken, {
      onError: (error) => logger.error('Failed to sync push token', error),
    });
  }, [expoPushToken, syncPushToken]);

  return null;
}
