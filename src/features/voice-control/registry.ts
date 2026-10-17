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
  /** For switches and options: whether it is on (checked or selected) now. */
  isOn?: () => boolean | undefined;
};

/** Where a scroll ended up: it moved, or it was already at that end. */
export type ScrollOutcome = 'moved' | 'at-top' | 'at-bottom' | 'not-scrollable';

export type ScrollTarget = {
  scroll: (to: ScrollDirection) => Promise<ScrollOutcome> | ScrollOutcome | void;
  isActive: () => boolean;
};

/** A field voice can read and type into ("type my answer", "change the title"). */
export type TextTarget = {
  label: string;
  read: () => string;
  write: (text: string) => void;
  /** Sends or submits what is typed, when the field has a send action. */
  submit?: () => void;
  isActive: () => boolean;
};

/** Words a screen shows that the host may ask about ("read me the prompt"). */
export type ContentSource = {
  /** What this is, for example "Today's prompt" or "Story". */
  label: string;
  read: () => string;
  isActive: () => boolean;
};

export type TypeMode = 'replace' | 'append';

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

function stateOf(target: PressTarget): boolean | undefined {
  return target.isOn?.();
}

function quoted(targets: PressTarget[]): string {
  const seen = new Set<string>();
  return targets
    .filter((target) => {
      const key = normalise(target.label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_LISTED)
    .map((target) => {
      const on = stateOf(target);
      return on === undefined ? `"${target.label}"` : `"${target.label}" (${on ? 'on' : 'off'})`;
    })
    .join(', ');
}

const SCROLLED: Record<ScrollDirection, string> = {
  up: 'Scrolled up.',
  down: 'Scrolled down.',
  top: 'Scrolled to the top.',
  bottom: 'Scrolled to the bottom.',
};

const MAX_CONTENT = 1_200;
/** Time for typed text to reach the screen's state before sending it. */
const SUBMIT_AFTER_TYPE_MS = 80;
const MAX_FIELD = 400;

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

export class VoiceControlRegistry {
  private readonly pressTargets = new Set<PressTarget>();
  private readonly scrollTargets: ScrollTarget[] = [];
  private readonly textTargets = new Set<TextTarget>();
  private readonly contentSources = new Set<ContentSource>();
  private screenNameFor: () => string = () => 'an app screen';

  /** How the app names the screen in front (set once by the call provider). */
  setScreenName(name: () => string): void {
    this.screenNameFor = name;
  }

  screenName(): string {
    return this.screenNameFor();
  }

  addTextTarget(target: TextTarget): () => void {
    this.textTargets.add(target);
    return () => {
      this.textTargets.delete(target);
    };
  }

  addContentSource(source: ContentSource): () => void {
    this.contentSources.add(source);
    return () => {
      this.contentSources.delete(source);
    };
  }

  activeFields(): TextTarget[] {
    return [...this.textTargets].filter((target) => target.isActive());
  }

  /**
   * What the host sees, for the model: the screen's name, what it says, the
   * fields and what is in them, and the buttons.
   */
  describe(): string {
    const lines = [`Screen: ${this.screenName()}.`];
    let room = MAX_CONTENT;
    for (const source of this.contentSources) {
      if (!source.isActive() || room <= 0) continue;
      const text = clip(source.read(), room);
      if (!text) continue;
      room -= text.length;
      lines.push(`${source.label}: "${text}"`);
    }
    const fields = this.activeFields();
    if (fields.length) {
      lines.push(
        `Fields: ${fields
          .map((field) => {
            const value = clip(field.read(), MAX_FIELD);
            return `"${field.label}" (${value ? `says "${value}"` : 'empty'}${field.submit ? ', can send' : ''})`;
          })
          .join(', ')}.`,
      );
    }
    const buttons = this.activeButtons();
    if (buttons.length) lines.push(`Buttons: ${quoted(buttons)}.`);
    const scrollable = this.scrollTargets.some((target) => target.isActive());
    lines.push(scrollable ? 'The screen can scroll.' : 'Nothing on this screen scrolls.');
    return lines.join('\n');
  }

  /**
   * Types into a field on the screen in front, so the host sees the words
   * appear. With no field named, uses the only field, or the focused one.
   */
  async type(
    text: string,
    options: { field?: string; mode?: TypeMode; send?: boolean } = {},
  ): Promise<string> {
    const fields = this.activeFields();
    if (!fields.length) {
      return `There is no field to type into on ${this.screenName()}. Open the screen with the field first.`;
    }
    let target: TextTarget | undefined;
    if (options.field) {
      const wanted = normalise(options.field);
      const exact = fields.filter((field) => normalise(field.label) === wanted);
      const partial = exact.length
        ? exact
        : fields.filter((field) => {
            const label = normalise(field.label);
            return wanted.length > 0 && (label.includes(wanted) || wanted.includes(label));
          });
      if (partial.length !== 1) {
        const names = fields.map((field) => `"${field.label}"`).join(', ');
        return partial.length
          ? `That matches more than one field: ${names}. Ask the host which one.`
          : `No field called "${options.field}". Fields on screen: ${names}.`;
      }
      [target] = partial;
    } else if (fields.length === 1) {
      [target] = fields;
    } else {
      const names = fields.map((field) => `"${field.label}"`).join(', ');
      return `Which field? Fields on screen: ${names}. Call again with field.`;
    }
    const before = target.read();
    const next =
      options.mode !== 'replace' && before.trim()
        ? `${before.replace(/\s+$/, '')}${/[\n]$/.test(before) ? '' : ' '}${text.trim()}`
        : text;
    target.write(next);
    const typed = `Typed into "${target.label}". It now says "${clip(next, MAX_FIELD)}".`;
    if (!options.send) return typed;
    if (!target.submit) return `${typed} This field has no send button; tell the host.`;
    // Let the screen take in the typed text before its send reads it.
    await new Promise((resolve) => setTimeout(resolve, SUBMIT_AFTER_TYPE_MS));
    target.submit();
    return `${typed} Sent.`;
  }
  /** Tappable things with no label voice could use (icon-only, unlabelled). */
  private readonly unlabelled = new Set<{ isActive: () => boolean }>();

  addUnlabelledTarget(target: { isActive: () => boolean }): () => void {
    this.unlabelled.add(target);
    return () => {
      this.unlabelled.delete(target);
    };
  }

  /** How many tappable things on screen voice cannot reach for want of a label. */
  unlabelledOnScreen(): number {
    let count = 0;
    for (const target of this.unlabelled) if (target.isActive()) count += 1;
    return count;
  }

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
    return [...this.pressTargets].filter(
      (target) => Boolean(normalise(target.label)) && target.isActive(),
    );
  }

  /**
   * Presses the button the host named. For switches and options, `turnOn`
   * says which way they want it; one already that way is left alone.
   */
  press(spoken: string, turnOn?: boolean, which?: number): string {
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
    let target: PressTarget;
    if (partial.length > 1) {
      // Never guess between buttons: two "Open"s are as ambiguous as
      // "Open" and "Open settings".
      const sameWords = new Set(partial.map((candidate) => normalise(candidate.label))).size === 1;
      if (which === undefined || !Number.isInteger(which) || which < 1 || which > partial.length) {
        return sameWords
          ? `There are ${partial.length} buttons called "${partial[0].label}" on this screen. Ask the host which one (first, second, …), then press again with which.`
          : `That matches more than one button: ${quoted(partial)}. Ask the host which one.`;
      }
      target = partial[which - 1];
    } else {
      [target] = partial;
    }
    if (NEEDS_HOST_TAP.test(target.label)) {
      return `"${target.label}" needs a tap from the host. Ask them to tap it themselves.`;
    }
    const on = stateOf(target);
    if (turnOn !== undefined && on === turnOn) {
      return `"${target.label}" is already ${on ? 'on' : 'off'}.`;
    }
    target.press();
    if (turnOn !== undefined && on !== undefined) {
      return `Pressed "${target.label}". It is now ${turnOn ? 'on' : 'off'}.`;
    }
    return `Pressed "${target.label}".`;
  }

  /** Scrolls, and says what really happened: at the top already is not "scrolled up". */
  async scroll(to: ScrollDirection): Promise<string> {
    const target = [...this.scrollTargets].reverse().find((candidate) => candidate.isActive());
    if (!target) return `Nothing on ${this.screenName()} scrolls.`;
    const outcome = await target.scroll(to);
    if (outcome === 'not-scrollable') return `Everything on ${this.screenName()} already fits; there is nothing to scroll.`;
    if (outcome === 'at-top') return 'It was already at the top; nothing moved.';
    if (outcome === 'at-bottom') return 'It was already at the bottom; nothing moved.';
    return SCROLLED[to];
  }
}

/** The app's one registry. */
export const voiceControl = new VoiceControlRegistry();
