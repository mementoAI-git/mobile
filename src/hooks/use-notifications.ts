import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
// Type-only import: this line is erased at compile time and never triggers
// the actual expo-notifications module code to run, so it's safe in Expo Go.
import type * as NotificationsType from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { useUiStore, useAuthStore } from '@/store';
import { logger } from '@/lib/logger';
import { normalizeAppHref } from '@/lib/navigation';
import { COLORS } from '@/constants/tokens';

const isExpoGo = Constants.appOwnership === 'expo';

// Lazily require the real module only when we're NOT in Expo Go.
// This prevents expo-notifications' own module-eval-time throw from ever firing.
function getNotifications(): typeof NotificationsType | null {
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-notifications') as typeof NotificationsType;
}

export function useNotifications() {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationsType.Notification | null>(null);
  const notificationListener = useRef<NotificationsType.Subscription | null>(null);
  const responseListener = useRef<NotificationsType.Subscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (isExpoGo) {
      logger.debug('Push notifications are not supported in Expo Go. Please use a development build.');
      return;
    }

    const Notifications = getNotifications();
    if (!Notifications) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    registerForPushNotificationsAsync().then((token) => {
      if (isMounted && token) setExpoPushToken(token);
    });

    const handleNotificationResponse = (response: NotificationsType.NotificationResponse) => {
      const data = response.notification.request.content.data as { type?: unknown; id?: unknown; url?: unknown };
      const type = typeof data?.type === 'string' ? data.type : null;
      const id = typeof data?.id === 'string' ? data.id : null;

      const isAuthenticated = useAuthStore.getState().token;
      const setPendingDeepLink = useUiStore.getState().setPendingDeepLink;

      const navigate = (dest: Href) => {
        if (isAuthenticated) {
          router.push(dest);
        } else {
          setPendingDeepLink(dest);
        }
      };

      // Priority 1: Direct URL if provided
      if (data?.url) {
        const href = normalizeAppHref(data.url);
        if (href) {
          navigate(href);
        } else {
          logger.warn('Ignored unsafe notification URL', data.url);
        }
        return;
      }

      // Priority 2: Typed data
      if (type === 'capsule') {
        navigate('/(tabs)/capsule');
      } else if (type === 'memory' && id) {
        navigate({ pathname: '/(tabs)/stories/[id]', params: { id } });
      } else if (type === 'chat' && id) {
        navigate({ pathname: '/chat/[id]', params: { id } });
      } else if (type === 'explore' && id) {
        navigate({ pathname: '/(tabs)/explore/[id]', params: { id } });
      }
    };

    // Check if app was opened by a notification while killed
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (isMounted && response) {
        handleNotificationResponse(response);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
      if (!isMounted) return;
      setNotification(notif);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        try {
          notificationListener.current.remove();
        } catch (e) {
          logger.error('Error removing notification subscription', e);
        } finally {
          notificationListener.current = null;
        }
      }
      if (responseListener.current) {
        try {
          responseListener.current.remove();
        } catch (e) {
          logger.error('Error removing response subscription', e);
        } finally {
          responseListener.current = null;
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // router is intentionally excluded — it changes on every navigation and would
           // tear down & re-register notification listeners on each route change.
           // We read it imperatively inside the stable handler via closure.

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: COLORS.brand,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

      if (!projectId) {
        logger.warn('Project ID not found in app config. Ensure EAS is configured.');
        return null;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e) {
      logger.error('Failed to get push token:', e);
    }
  } else {
    logger.debug('Must use physical device for Push Notifications');
  }

  return token;
}
