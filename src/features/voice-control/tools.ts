import type { VoiceToolHandler } from '../chat/voice-tool-relay';
import type { ScrollDirection, VoiceControlRegistry } from './registry';

/** Token capability: this build can scroll, go back and press buttons by voice. */
export const SCREEN_CONTROL_CAPABILITY = 'screen_control';

export const SCROLL_TOOL = 'scroll';
export const GO_BACK_TOOL = 'go_back';
export const PRESS_BUTTON_TOOL = 'press_button';
export const SCREEN_CONTROL_TOOLS = [SCROLL_TOOL, GO_BACK_TOOL, PRESS_BUTTON_TOOL];

const DIRECTIONS: ScrollDirection[] = ['up', 'down', 'top', 'bottom'];

/** Voice control of the screen in front of the host. */
export function createScreenControlHandlers(deps: {
  registry: VoiceControlRegistry;
  canGoBack: () => boolean;
  goBack: () => void;
}): Record<string, VoiceToolHandler> {
  return {
    [SCROLL_TOOL]: (args) => {
      const direction = args.direction as ScrollDirection;
      if (!DIRECTIONS.includes(direction)) return 'Scroll direction must be up, down, top or bottom.';
      return deps.registry.scroll(direction);
    },
    [GO_BACK_TOOL]: () => {
      if (!deps.canGoBack()) return 'There is no screen to go back to.';
      deps.goBack();
      return 'Went back.';
    },
    [PRESS_BUTTON_TOOL]: (args) => {
      const label = typeof args.label === 'string' ? args.label.trim() : '';
      if (!label) return 'Which button? Ask the host what it says.';
      const turnOn = typeof args.turn_on === 'boolean' ? args.turn_on : undefined;
      return deps.registry.press(label.slice(0, 80), turnOn);
    },
  };
}
