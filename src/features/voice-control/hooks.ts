import { type Component, useContext, useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { NavigationContext } from 'expo-router/react-navigation';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';

import { voiceControl } from './registry';

/** Share of the screen one "scroll down" moves. */
const SCROLL_PAGE = 0.7;

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
): void {
  const inFront = useIsScreenInFront();
  const state = useRef({ onPress, enabled, inFront });
  state.current = { onPress, enabled, inFront };

  useEffect(() => {
    const name = label?.trim();
    if (!name) return;
    return voiceControl.addPressTarget({
      label: name,
      press: () => state.current.onPress?.(),
      isActive: () =>
        state.current.enabled && Boolean(state.current.onPress) && state.current.inFront(),
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
        scroll: (to) => {
          const list = ref.current as unknown as VoiceScrollable | null;
          if (!list) return;
          if (to === 'bottom') {
            list.scrollToEnd?.({ animated: true });
            return;
          }
          const page = Dimensions.get('window').height * SCROLL_PAGE;
          const y = to === 'top' ? 0 : Math.max(0, offset.value + (to === 'down' ? page : -page));
          if (typeof list.scrollToOffset === 'function') {
            list.scrollToOffset({ offset: y, animated: true });
          } else {
            list.scrollTo?.({ y, animated: true });
          }
        },
      }),
    [offset, ref],
  );

  return ref;
}
