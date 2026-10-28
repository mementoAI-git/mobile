import { type Component, useContext, useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { NavigationContext } from 'expo-router/react-navigation';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';

import { voiceControl, type ScrollOutcome } from './registry';

/** Share of the screen one "scroll down" moves. */
const SCROLL_PAGE = 0.7;
/** How long an animated scroll takes to settle before checking where it went. */
const SCROLL_SETTLE_MS = 450;
/** Movement smaller than this (points) is not a scroll. */
const SCROLL_MOVED = 4;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True while the screen this component is on is the one in front. */
function useIsScreenInFront(): () => boolean {
  // Outside a navigator (sheets, the root) there is no screen to check.
  const navigation = useContext(NavigationContext);
  return () => (navigation ? navigation.isFocused() : true);
}

/**
 * Lets voice press this button ("tap Save") while its screen is in front and
 * it is enabled. `label` is what the host would say: the button's text.
 */
export function useVoicePressTarget(
  label: string | undefined,
  onPress: (() => void) | undefined,
  enabled: boolean,
  /** For switches and options: whether it is on now. */
  isOn?: boolean,
): void {
  const inFront = useIsScreenInFront();
  const state = useRef({ onPress, enabled, inFront, isOn });
  state.current = { onPress, enabled, inFront, isOn };

  useEffect(() => {
    const name = label?.trim();
    if (!name) {
      // Counted so unreachable (unlabelled) taps show up in development.
      return voiceControl.addUnlabelledTarget({
        isActive: () => Boolean(state.current.onPress) && state.current.inFront(),
      });
    }
    return voiceControl.addPressTarget({
      label: name,
      press: () => state.current.onPress?.(),
      isActive: () =>
        state.current.enabled && Boolean(state.current.onPress) && state.current.inFront(),
      isOn: () => state.current.isOn,
    });
  }, [label]);
}

type VoiceScrollable = {
  scrollTo?: (options: { y: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
  scrollToEnd?: (options?: { animated?: boolean }) => void;
};

/**
 * Lets voice scroll this list ("scroll down", "go to the top"). Pass the
 * returned ref to a Reanimated list (Animated.ScrollView, Animated.FlatList).
 */
export function useVoiceScroll<T extends Component>() {
  const ref = useAnimatedRef<T>();
  const offset = useScrollOffset(ref as never);
  const inFront = useIsScreenInFront();
  const inFrontRef = useRef(inFront);
  inFrontRef.current = inFront;

  useEffect(
    () =>
      voiceControl.addScrollTarget({
        isActive: () => inFrontRef.current(),
        scroll: async (to): Promise<ScrollOutcome> => {
          const list = ref.current as unknown as VoiceScrollable | null;
          if (!list) return 'not-scrollable';
          const before = offset.value;
          const upward = to === 'up' || to === 'top';
          // Already at the top: say so instead of claiming it scrolled.
          if (upward && before < SCROLL_MOVED) return 'at-top';
          if (to === 'bottom') {
            list.scrollToEnd?.({ animated: true });
          } else {
            const page = Dimensions.get('window').height * SCROLL_PAGE;
            const y = to === 'top' ? 0 : Math.max(0, before + (to === 'down' ? page : -page));
            if (typeof list.scrollToOffset === 'function') {
              list.scrollToOffset({ offset: y, animated: true });
            } else {
              list.scrollTo?.({ y, animated: true });
            }
          }
          await wait(SCROLL_SETTLE_MS);
          if (Math.abs(offset.value - before) >= SCROLL_MOVED) return 'moved';
          if (upward) return 'at-top';
          return before < SCROLL_MOVED ? 'not-scrollable' : 'at-bottom';
        },
      }),
    [offset, ref],
  );

  return ref;
}

/**
 * Lets voice read and type into this field ("type my answer", "change the
 * title to …"), while its screen is in front. `label` is what the host would
 * call it. `submit` is its send action, if it has one.
 */
export function useVoiceTextField(
  label: string | undefined,
  /** The text now; a function when it changes without re-rendering. */
  value: string | (() => string) | undefined,
  onChangeText: ((text: string) => void) | undefined,
  options: { enabled?: boolean; submit?: () => void } = {},
): void {
  const inFront = useIsScreenInFront();
  const state = useRef({ value, onChangeText, inFront, ...options });
  state.current = { value, onChangeText, inFront, ...options };

  useEffect(() => {
    const name = label?.trim();
    if (!name) return undefined;
    return voiceControl.addTextTarget({
      label: name,
      read: () => {
        const current = state.current.value;
        return (typeof current === 'function' ? current() : current) ?? '';
      },
      write: (text) => state.current.onChangeText?.(text),
      submit: options.submit ? () => state.current.submit?.() : undefined,
      isActive: () =>
        state.current.enabled !== false &&
        Boolean(state.current.onChangeText) &&
        state.current.inFront(),
    });
    // Only the label and whether it can send change the registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, Boolean(options.submit)]);
}

/**
 * Lets voice read what this screen shows ("read me the prompt"). `read`
 * returns the words as the host sees them.
 */
export function useVoiceContent(label: string, read: () => string, enabled = true): void {
  const inFront = useIsScreenInFront();
  const state = useRef({ read, inFront, enabled });
  state.current = { read, inFront, enabled };

  useEffect(
    () =>
      voiceControl.addContentSource({
        label,
        read: () => state.current.read(),
        isActive: () => state.current.enabled && state.current.inFront(),
      }),
    [label],
  );
}
