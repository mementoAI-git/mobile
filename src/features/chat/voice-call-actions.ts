import type { VoiceToolHandler } from './voice-tool-relay';

export const END_CALL_TOOL = 'end_call';
export const SET_MICROPHONE_TOOL = 'set_microphone';
export const OPEN_SCREEN_TOOL = 'open_screen';
export const CALL_ACTION_TOOLS = [END_CALL_TOOL, SET_MICROPHONE_TOOL, OPEN_SCREEN_TOOL];

/** Token capability that asks the API to lock the call action tools into the session. */
export const CALL_ACTIONS_CAPABILITY = 'call_actions';

/**
 * Screens the model may open. Keep the keys in sync with
 * VOICE_SCREEN_DESTINATIONS in api/src/module/api/ai/live-session-config.ts,
 * apart from people, which only web has, and time_capsules, paused (its
 * screen is a Coming soon page); the model hears "That screen isn't
 * available" for those here.
 */
export const VOICE_DESTINATIONS = {
  home: { href: '/(tabs)/overview', label: 'home' },
  chat: { href: '/(tabs)/chat', label: 'chat' },
  stories: { href: '/(tabs)/stories', label: 'your stories' },
  bookmarks: { href: '/(tabs)/stories?filter=bookmarked', label: 'your bookmarked stories' },
  new_story: { href: '/editor?mode=story&lockMode=true', label: 'a new story' },
  quick_note: { href: '/editor?mode=quick-capture', label: 'a quick note' },
  explore_prompts: { href: '/(tabs)/explore', label: 'topics' },
  insights: { href: '/insights', label: 'insights' },
  account: { href: '/account', label: 'your account' },
  settings: { href: '/settings', label: 'settings' },
  profile: { href: '/settings/profile', label: 'your profile' },
  plan_and_billing: { href: '/settings/billing', label: 'plan and billing' },
  upgrade: { href: '/pricing', label: 'plans' },
  privacy: { href: '/settings/privacy', label: 'privacy settings' },
  // 'beneficiaries' is the name the API still sends; 'connections' is its replacement.
  beneficiaries: { href: '/settings/beneficiaries', label: 'your connections' },
  connections: { href: '/settings/beneficiaries', label: 'your connections' },
  feedback: { href: '/settings/feedback', label: 'feedback' },
  activity: { href: '/settings/activities', label: 'your activity' },
  two_factor: { href: '/settings/two-factor', label: 'two-factor settings' },
} as const;

export type VoiceDestination = keyof typeof VOICE_DESTINATIONS;

export function resolveVoiceDestination(
  value: unknown,
): (typeof VOICE_DESTINATIONS)[VoiceDestination] | undefined {
  if (typeof value !== 'string') return undefined;
  if (!Object.prototype.hasOwnProperty.call(VOICE_DESTINATIONS, value)) return undefined;
  return VOICE_DESTINATIONS[value as VoiceDestination];
}

/** What the call actions need from the app. */
export interface CallControls {
  /** Hang up once the model's goodbye has played, then run `then`. */
  endAfterGoodbye(then?: () => void): void;
  setMuted(muted: boolean): void;
  /** Open a screen while the call keeps going. */
  navigate(href: string): void;
}

export function createCallActionHandlers(
  controls: CallControls,
): Record<string, VoiceToolHandler> {
  return {
    [END_CALL_TOOL]: () => {
      controls.endAfterGoodbye();
      return 'Ending the call after your goodbye.';
    },
    [SET_MICROPHONE_TOOL]: (args) => {
      if (args.muted === false) {
        return 'You cannot unmute the host. They tap the screen to unmute.';
      }
      controls.setMuted(true);
      return 'Microphone muted. The host will tap to unmute.';
    },
    [OPEN_SCREEN_TOOL]: (args) => {
      const target = resolveVoiceDestination(args.destination);
      if (!target) return "That screen isn't available. Tell the host you can't open it.";
      if (args.keep_talking === true) {
        controls.navigate(target.href);
        return `Opened ${target.label}. The call continues.`;
      }
      controls.endAfterGoodbye(() => controls.navigate(target.href));
      return `Opening ${target.label} after your goodbye.`;
    },
  };
}