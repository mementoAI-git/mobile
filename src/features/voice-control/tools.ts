import type { VoiceToolHandler } from '../chat/voice-tool-relay';
import type { ScrollDirection, VoiceControlRegistry } from './registry';

/** Token capability: this build can scroll, go back and press buttons by voice. */
export const SCREEN_CONTROL_CAPABILITY = 'screen_control';
/** Token capability: this build can also read the screen and type into its fields. */
export const SCREEN_FIELDS_CAPABILITY = 'screen_fields';

export const SCROLL_TOOL = 'scroll';
export const GO_BACK_TOOL = 'go_back';
export const PRESS_BUTTON_TOOL = 'press_button';
export const LOOK_AT_SCREEN_TOOL = 'look_at_screen';
export const TYPE_TEXT_TOOL = 'type_text';
export const SCREEN_CONTROL_TOOLS = [
  SCROLL_TOOL,
  GO_BACK_TOOL,
  PRESS_BUTTON_TOOL,
  LOOK_AT_SCREEN_TOOL,
  TYPE_TEXT_TOOL,
];

/** Time for a navigation to finish before saying where the host is now. */
export const SCREEN_SETTLE_MS = 500;

const DIRECTIONS: ScrollDirection[] = ['up', 'down', 'top', 'bottom'];

/** Voice control of the screen in front of the host. */
export function createScreenControlHandlers(deps: {
  registry: VoiceControlRegistry;
  canGoBack: () => boolean;
  goBack: () => void;
  settleMs?: number;
}): Record<string, VoiceToolHandler> {
  const settle = () =>
    new Promise((resolve) => setTimeout(resolve, deps.settleMs ?? SCREEN_SETTLE_MS));
  return {
    [LOOK_AT_SCREEN_TOOL]: () => deps.registry.describe(),
    [TYPE_TEXT_TOOL]: (args) => {
      const text = typeof args.text === 'string' ? args.text : '';
      if (!text.trim()) return 'What should be typed? Use the host\'s own words.';
      return deps.registry.type(text.slice(0, 4_000), {
        field: typeof args.field === 'string' && args.field.trim() ? args.field : undefined,
        mode: args.mode === 'replace' ? 'replace' : 'append',
        send: args.send === true,
      });
    },
    [SCROLL_TOOL]: (args) => {
      const direction = args.direction as ScrollDirection;
      if (!DIRECTIONS.includes(direction)) return 'Scroll direction must be up, down, top or bottom.';
      return deps.registry.scroll(direction);
    },
    [GO_BACK_TOOL]: async () => {
      const from = deps.registry.screenName();
      if (!deps.canGoBack()) return `There is no screen to go back to; still on ${from}.`;
      deps.goBack();
      await settle();
      const now = deps.registry.screenName();
      return now === from ? `Went back. Still on ${now}.` : `Went back from ${from}. Now on ${now}.`;
    },
    [PRESS_BUTTON_TOOL]: async (args) => {
      const label = typeof args.label === 'string' ? args.label.trim() : '';
      if (!label) return 'Which button? Ask the host what it says.';
      const turnOn = typeof args.turn_on === 'boolean' ? args.turn_on : undefined;
      const which = typeof args.which === 'number' ? args.which : undefined;
      const from = deps.registry.screenName();
      const result = deps.registry.press(label.slice(0, 80), turnOn, which);
      if (!result.startsWith('Pressed')) return result;
      await settle();
      const now = deps.registry.screenName();
      return now === from ? result : `${result} Now on ${now}.`;
    },
  };
}
