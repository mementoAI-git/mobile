import { describe, expect, test, beforeEach, mock } from 'bun:test';

const memoryStore: Record<string, string> = {};

mock.module('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mock(async (key: string) => memoryStore[key] ?? null),
    setItem: mock(async (key: string, value: string) => {
      memoryStore[key] = value;
    }),
    removeItem: mock(async (key: string) => {
      delete memoryStore[key];
    }),
  },
}));

mock.module('expo-notifications', () => ({
  cancelScheduledNotificationAsync: mock(async () => {}),
  scheduleNotificationAsync: mock(async () => 'memento_daily_ritual'),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
  },
}));

mock.module('expo-constants', () => ({
  default: {
    appOwnership: 'expo',
  },
}));

describe('daily ritual scheduler', () => {
  beforeEach(() => {
    for (const key of Object.keys(memoryStore)) {
      delete memoryStore[key];
    }
  });

  test('returns default disabled settings when none saved', async () => {
    const { getDailyRitualSettings } = await import('./ritual-scheduler');
    const settings = await getDailyRitualSettings();
    expect(settings).toEqual({
      enabled: false,
      hour: 20,
      minute: 30,
    });
  });

  test('saves and schedules ritual settings', async () => {
    const { scheduleDailyRitual, getDailyRitualSettings } = await import('./ritual-scheduler');
    const scheduled = await scheduleDailyRitual(8, 0, 'Alex');
    expect(scheduled).toBe(true);

    const saved = await getDailyRitualSettings();
    expect(saved).toEqual({
      enabled: true,
      hour: 8,
      minute: 0,
    });
  });

  test('cancels daily ritual by disabling in settings', async () => {
    const { scheduleDailyRitual, cancelDailyRitual, getDailyRitualSettings } = await import('./ritual-scheduler');
    await scheduleDailyRitual(20, 30, 'Alex');
    await cancelDailyRitual();

    const saved = await getDailyRitualSettings();
    expect(saved.enabled).toBe(false);
    expect(saved.hour).toBe(20);
    expect(saved.minute).toBe(30);
  });
});
