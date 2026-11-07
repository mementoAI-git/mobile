import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';
import { logger } from '@/lib/logger';

const isExpoGo = Constants.appOwnership === 'expo';
const RITUAL_STORAGE_KEY = 'memento.daily_ritual';
const RITUAL_NOTIFICATION_ID = 'memento_daily_ritual';

function getNotifications(): typeof NotificationsType | null {
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-notifications') as typeof NotificationsType;
}

export interface DailyRitualSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export async function getDailyRitualSettings(): Promise<DailyRitualSettings> {
  try {
    const raw = await AsyncStorage.getItem(RITUAL_STORAGE_KEY);
    if (!raw) return { enabled: false, hour: 20, minute: 30 }; // Default 8:30 PM
    return JSON.parse(raw);
  } catch {
    return { enabled: false, hour: 20, minute: 30 };
  }
}

export async function scheduleDailyRitual(
  hour: number,
  minute: number,
  nickname?: string
): Promise<boolean> {
  try {
    const settings: DailyRitualSettings = { enabled: true, hour, minute };
    await AsyncStorage.setItem(RITUAL_STORAGE_KEY, JSON.stringify(settings));

    const Notifications = getNotifications();
    if (!Notifications) {
      logger.debug('Push notifications not available in Expo Go for daily ritual.');
      return true;
    }

    // Cancel existing ritual notification if scheduled
    await Notifications.cancelScheduledNotificationAsync(RITUAL_NOTIFICATION_ID).catch(() => {});

    const name = nickname?.trim() || 'Friend';

    await Notifications.scheduleNotificationAsync({
      identifier: RITUAL_NOTIFICATION_ID,
      content: {
        title: 'A Quiet Moment for You ✦',
        body: `${name}, take 3 minutes to reflect on today's story and preserve it in your vault.`,
        data: { type: 'daily-prompt', url: '/(tabs)/chat' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      } as any,
    });

    return true;
  } catch (error) {
    logger.handledError('Failed to schedule daily ritual notification', error);
    return false;
  }
}

export async function cancelDailyRitual(): Promise<void> {
  try {
    const current = await getDailyRitualSettings();
    await AsyncStorage.setItem(
      RITUAL_STORAGE_KEY,
      JSON.stringify({ ...current, enabled: false })
    );

    const Notifications = getNotifications();
    if (Notifications) {
      await Notifications.cancelScheduledNotificationAsync(RITUAL_NOTIFICATION_ID).catch(() => {});
    }
  } catch (error) {
    logger.handledError('Failed to cancel daily ritual', error);
  }
}
