import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  MemoryDisc,
  MemoryNotebook,
  MemoryNotes,
  MemoryPhoto,
} from "./MemoryArtworkIllustrations";

const AnimatedView = Animated.View;

export function MemoryCardArtwork() {
  const reduceMotion = useReducedMotion();
  const didAnimate = useRef(false);

  // CD
  const discProgress = useSharedValue(0);

  // Music notes
  const notesProgress = useSharedValue(0);

  // Photo
  const photoProgress = useSharedValue(0);

  // Notebook
  const notebookProgress = useSharedValue(0);

  useEffect(() => {
    if (didAnimate.current) return;
    didAnimate.current = true;

    if (reduceMotion) {
      discProgress.value = 1;
      notesProgress.value = 1;
      photoProgress.value = 1;
      notebookProgress.value = 1;
      return;
    }

    const easing = Easing.bezier(0.22, 1, 0.36, 1);

    discProgress.value = withDelay(
      40,
      withTiming(1, {
        duration: 620,
        easing,
      }),
    );

    photoProgress.value = withDelay(
      90,
      withTiming(1, {
        duration: 650,
        easing,
      }),
    );

    notesProgress.value = withDelay(
      150,
      withTiming(1, {
        duration: 600,
        easing,
      }),
    );

    notebookProgress.value = withDelay(
      190,
      withTiming(1, {
        duration: 650,
        easing,
      }),
    );
  }, [
    reduceMotion,
    discProgress,
    notesProgress,
    photoProgress,
    notebookProgress,
  ]);

  const discStyle = useAnimatedStyle(() => {
    const p = discProgress.value;

    return {
      opacity: p,
      transform: [
        {
          translateX: -7 * (1 - p),
        },
        {
          translateY: 2 * (1 - p),
        },
        {
          rotate: `${-7 * (1 - p)}deg`,
        },
        {
          scale: 0.91 + 0.09 * p,
        },
      ],
    };
  });

  const notesStyle = useAnimatedStyle(() => {
    const p = notesProgress.value;

    return {
      opacity: p,
      transform: [
        {
          translateX: -2 * (1 - p),
        },
        {
          translateY: 7 * (1 - p),
        },
        {
          rotate: `${-3 * (1 - p)}deg`,
        },
        {
          scale: 0.9 + 0.1 * p,
        },
      ],
    };
  });

  const photoStyle = useAnimatedStyle(() => {
    const p = photoProgress.value;

    return {
      opacity: p,
      transform: [
        {
          translateY: -8 * (1 - p),
        },
        {
          rotate: `${3.5 * (1 - p)}deg`,
        },
        {
          scale: 0.92 + 0.08 * p,
        },
      ],
    };
  });

  const notebookStyle = useAnimatedStyle(() => {
    const p = notebookProgress.value;

    return {
      opacity: p,
      transform: [
        {
          translateX: 7 * (1 - p),
        },
        {
          translateY: -3 * (1 - p),
        },
        {
          rotate: `${4 * (1 - p)}deg`,
        },
        {
          scale: 0.92 + 0.08 * p,
        },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={styles.artwork}
    >
      <AnimatedView style={[styles.disc, discStyle]}>
        <MemoryDisc width="100%" height="100%" />
      </AnimatedView>

      <AnimatedView style={[styles.photo, photoStyle]}>
        <MemoryPhoto width="100%" height="100%" />
      </AnimatedView>

      <AnimatedView style={[styles.notes, notesStyle]}>
        <MemoryNotes width="100%" height="100%" />
      </AnimatedView>

      <AnimatedView style={[styles.notebook, notebookStyle]}>
        <MemoryNotebook width="100%" height="100%" />
      </AnimatedView>
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    width: 98,
    height: 72,
    position: "relative",
  },

  /*
   * These placements recreate the composite,
   * but leave every object independently animatable.
   */

  disc: {
    position: "absolute",
    width: 42,
    height: 42,
    left: 0,
    top: 25,
  },

  photo: {
    position: "absolute",
    width: 42,
    height: 42,
    left: 33,
    top: 0,
  },

  notes: {
    position: "absolute",
    width: 42,
    height: 42,
    left: 19,
    top: 30,
  },

  notebook: {
    position: "absolute",
    width: 40,
    height: 40,
    right: 0,
    top: 29,
  },
});