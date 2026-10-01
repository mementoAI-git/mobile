import { describe, expect, test } from 'bun:test';

import {
  CALL_NOTIFICATION,
  VoiceCallNotification,
  type CallNotificationAdapter,
  type CallNotificationInfo,
} from './voice-call-notification';

function fakeAdapter(options: { failShow?: boolean } = {}) {
  const calls: string[] = [];
  let stopListener: (() => void) | undefined;
  const adapter: CallNotificationAdapter = {
    async show(info: CallNotificationInfo) {
      calls.push(`show:${info.title}:${info.showStopAction}`);
      if (options.failShow) throw new Error('notifications blocked');
    },
    async hide() {
      calls.push('hide');
    },
    onStop(listener) {
      calls.push('subscribe');
      stopListener = listener;
      return { remove: () => calls.push('unsubscribe') };
    },
  };
  return { adapter, calls, pressStop: () => stopListener?.() };
}

describe('VoiceCallNotification', () => {
  test('shows once, relays the stop action, and cleans up once', async () => {
    const { adapter, calls, pressStop } = fakeAdapter();
    const notification = new VoiceCallNotification(adapter);
    let stopped = 0;

    await notification.start(() => {
      stopped += 1;
    });
    await notification.start(() => undefined);
    pressStop();
    await notification.stop();
    await notification.stop();

    expect(stopped).toBe(1);
    expect(calls).toEqual(['subscribe', 'show:Memento voice call:true', 'unsubscribe', 'hide']);
  });

  test('never throws when the notification cannot be shown', async () => {
    const { adapter } = fakeAdapter({ failShow: true });
    const notification = new VoiceCallNotification(adapter);

    await expect(notification.start(() => undefined)).resolves.toBeUndefined();
    await expect(notification.stop()).resolves.toBeUndefined();
  });

  test('is a no-op without an adapter (iOS)', async () => {
    const notification = new VoiceCallNotification(null);

    await expect(notification.start(() => undefined)).resolves.toBeUndefined();
    await expect(notification.stop()).resolves.toBeUndefined();
  });

  test('shows the call time, an End call button, and returns to the call on tap', () => {
    expect(CALL_NOTIFICATION).toMatchObject({
      showStopAction: true,
      stopActionTitle: 'End call',
      deepLinkUri: 'memento://voice-call',
      usesChronometer: true,
      callStyle: true,
      callerName: 'Memento',
    });
  });
});
