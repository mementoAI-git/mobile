/**
 * What voice can press and scroll on the screen in front of the host.
 * Buttons and lists register while mounted; `isActive` keeps targets on
 * screens behind the current one (still mounted in the stack) out of reach.
 *
 * Results are sentences for the voice model: what happened, or what is on
 * screen when it could not tell which button was meant.
 */

export type ScrollDirection = 'up' | 'down' | 'top' | 'bottom';

export type PressTarget = {
  label: string;
  press: () => void;
  /** True while this button is on the screen in front of the host and enabled. */
  isActive: () => boolean;
};

export type ScrollTarget = {
  scroll: (to: ScrollDirection) => void;
  isActive: () => boolean;
};

/**
 * Never pressed by voice: deleting, cancelling, paying, subscribing and
 * signing out need the host's own tap.
 */
const NEEDS_HOST_TAP =
  /\b(delete|remove|erase|cancel (my )?(plan|subscription)|unsubscribe|subscribe|upgrade|purchase|buy|pay|checkout|sign out|log ?out|deactivate|close (my )?account)\b/i;

const MAX_LISTED = 8;

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function quoted(targets: PressTarget[]): string {
  return targets
    .slice(0, MAX_LISTED)
    .map((target) => `"${target.label}"`)
    .join(', ');
}

const SCROLLED: Record<ScrollDirection, string> = {
  up: 'Scrolled up.',
  down: 'Scrolled down.',
  top: 'Scrolled to the top.',
  bottom: 'Scrolled to the bottom.',
};

export class VoiceControlRegistry {
  private readonly pressTargets = new Set<PressTarget>();
  private readonly scrollTargets: ScrollTarget[] = [];

  addPressTarget(target: PressTarget): () => void {
    this.pressTargets.add(target);
    return () => {
      this.pressTargets.delete(target);
    };
  }

  addScrollTarget(target: ScrollTarget): () => void {
    this.scrollTargets.push(target);
    return () => {
      const index = this.scrollTargets.indexOf(target);
      if (index >= 0) this.scrollTargets.splice(index, 1);
    };
  }

  /** Buttons on the screen in front of the host, in mount order. */
  activeButtons(): PressTarget[] {
    const seen = new Set<string>();
    return [...this.pressTargets].filter((target) => {
      const key = normalise(target.label);
      if (!key || seen.has(key) || !target.isActive()) return false;
      seen.add(key);
      return true;
    });
  }

  press(spoken: string): string {
    const wanted = normalise(spoken);
    const buttons = this.activeButtons();
    const exact = buttons.filter((target) => normalise(target.label) === wanted);
    const partial = exact.length
      ? exact
      : buttons.filter((target) => {
          const label = normalise(target.label);
          return wanted.length > 0 && (label.includes(wanted) || wanted.includes(label));
        });

    if (partial.length === 0) {
      const onScreen = buttons.length ? ` Buttons on screen: ${quoted(buttons)}.` : '';
      return `No button called "${spoken}" on this screen.${onScreen}`;
    }
    if (partial.length > 1) {
      return `That matches more than one button: ${quoted(partial)}. Ask the host which one.`;
    }
    const [target] = partial;
    if (NEEDS_HOST_TAP.test(target.label)) {
      return `"${target.label}" needs a tap from the host. Ask them to tap it themselves.`;
    }
    target.press();
    return `Pressed "${target.label}".`;
  }

  scroll(to: ScrollDirection): string {
    const target = [...this.scrollTargets].reverse().find((candidate) => candidate.isActive());
    if (!target) return 'There is nothing to scroll on this screen.';
    target.scroll(to);
    return SCROLLED[to];
  }
}

/** The app's one registry. */
export const voiceControl = new VoiceControlRegistry();
