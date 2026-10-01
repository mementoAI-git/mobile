export type CallNotificationSubscription = { remove(): void };

export type CallNotificationInfo = {
  title: string;
  contentText: string;
  showStopAction: boolean;
};

export interface CallNotificationAdapter {
  show(info: CallNotificationInfo): Promise<void>;
  hide(): Promise<void>;
  onStop(listener: () => void): CallNotificationSubscription;
}

const CALL_NOTIFICATION: CallNotificationInfo = {
  title: 'Memento voice call',
  contentText: 'Tap to return to your conversation',
  showStopAction: true,
};

/**
 * Keeps an Android voice call alive in the background. Showing the
 * react-native-audio-api recording notification starts its foreground
 * service with the microphone type. iOS needs nothing: UIBackgroundModes
 * `audio` keeps the active voice-chat audio session running.
 */
export class VoiceCallNotification {
  private subscription?: CallNotificationSubscription;
  private active = false;

  constructor(private readonly adapter: CallNotificationAdapter | null) {}

  async start(onStop: () => void): Promise<void> {
    if (!this.adapter || this.active) return;
    this.active = true;
    this.subscription = this.adapter.onStop(onStop);
    try {
      await this.adapter.show(CALL_NOTIFICATION);
    } catch {
      // Without the notification the call still works while the app is open.
    }
  }

  async stop(): Promise<void> {
    if (!this.adapter || !this.active) return;
    this.active = false;
    this.subscription?.remove();
    this.subscription = undefined;
    try {
      await this.adapter.hide();
    } catch {
      // Already hidden.
    }
  }
}

export function createCallNotificationAdapter(platform: string): CallNotificationAdapter | null {
  if (platform !== 'android') return null;
  const { RecordingNotificationManager } =
    require('react-native-audio-api') as typeof import('react-native-audio-api');
  return {
    show: (info) => RecordingNotificationManager.show(info),
    hide: () => RecordingNotificationManager.hide(),
    onStop: (listener) =>
      RecordingNotificationManager.addEventListener('recordingNotificationStop', () => listener()),
  };
}
