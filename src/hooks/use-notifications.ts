import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useUiStore, useAuthStore } from '@/store';

// Notifications.setNotificationHandler is moved inside useEffect to avoid issues in Expo Go

export function useNotifications() {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (Constants.appOwnership === 'expo') {
      console.log('Push notifications are not supported in Expo Go (SDK 53+). Please use a development build.');
      return;
    }

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

    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { type?: string; id?: string; url?: string };
      console.log('Notification response data:', data);

      const isAuthenticated = useAuthStore.getState().token;
      const setPendingDeepLink = useUiStore.getState().setPendingDeepLink;

      const navigate = (dest: any) => {
        if (isAuthenticated) {
          router.push(dest);
        } else {
          setPendingDeepLink(dest);
        }
      };

      // Priority 1: Direct URL if provided
      if (data?.url) {
        navigate(data.url);
        return;
      }

      // Priority 2: Typed data
      if (data?.type === 'capsule') {
        navigate('/(tabs)/capsule');
      } else if (data?.type === 'memory' && data.id) {
        navigate({ pathname: '/(tabs)/stories/[id]', params: { id: data.id } });
      } else if (data?.type === 'chat' && data.id) {
        navigate({ pathname: '/chat/[id]', params: { id: data.id } });
      } else if (data?.type === 'explore' && data.id) {
        navigate({ pathname: '/(tabs)/explore/[id]', params: { id: data.id } });
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
          console.log('Error removing notification subscription', e);
        } finally {
          notificationListener.current = null;
        }
      }
      if (responseListener.current) {
        try {
          responseListener.current.remove();
        } catch (e) {
          console.log('Error removing response subscription', e);
        } finally {
          responseListener.current = null;
        }
      }
    };
  }, [router]);

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5E00',
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
        console.warn('Project ID not found in app config. Ensure EAS is configured.');
        return null;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e) {
      console.error('Failed to get push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
