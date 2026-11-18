import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import Check from 'lucide-react-native/icons/check';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import { Pressable } from '@/components/ui/Touchable';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import {
  FLOATING_CALL_EDGE,
  FLOATING_CALL_NUDGE_HEIGHT,
  FLOATING_CALL_NUDGE_WIDTH,
  floatingCallRestX,
  floatingCallTuckX,
  floatingCallWidth,
  type FloatingCallSide,
} from '@/features/chat/floating-call-position';
import { useRecordingSession } from '@/features/overview/recording-session';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';

/**
 * A minimized Overview recording, floating over every screen like the voice call
 * card: drag it anywhere, push it past the left or right edge to tuck it behind a
 * small tab (tap or pull the tab to bring it back), tap it to open the recorder,
 * pause or finish it from here. Shown while a take is going and its sheet is closed.
 */
export function FloatingRecorder() {
  const { busy, expanded } = useRecordingSession();
  if (!busy || expanded) return null;
  const card = <FloatingRecorderCard />;
  return Platform.OS === 'ios' ? (
    <FullWindowOverlay>{card}</FullWindowOverlay>
  ) : (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{card}</View>
  );
}

function FloatingRecorderCard() {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const { isPaused, duration, recordingLive, saving, open, done, togglePause } = useRecordingSession();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const width = floatingCallWidth(screenWidth);
  const [height, setHeight] = useState(88);
  const [side, setSide] = useState<FloatingCallSide | null>(null);
  const sideRef = useRef(side);
  sideRef.current = side;

  const bounds = useMemo(() => ({
    screenWidth,
    width,
    minY: insets.top + FLOATING_CALL_EDGE,
    maxY: Math.max(insets.top + FLOATING_CALL_EDGE, screenHeight - insets.bottom - height - FLOATING_CALL_EDGE),
  }), [height, insets.bottom, insets.top, screenHeight, screenWidth, width]);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  // Opens top right, below the header, where the voice call card opens.
  const start = { x: floatingCallRestX('right', screenWidth, width), y: insets.top + 64 };
  const position = useRef(new Animated.ValueXY(start)).current;
  const current = useRef(start);
  useEffect(() => {
    const id = position.addListener((value) => { current.current = value; });
    return () => position.removeListener(id);
  }, [position]);

  /** 1 while the card is out, 0 while tucked: fades the card and brings in the tab. */
  const shown = useRef(new Animated.Value(1)).current;

  const moveTo = useCallback((x: number, y: number) => {
    Animated.spring(position, { toValue: { x, y }, useNativeDriver: false, bounciness: 4, speed: 16 }).start();
  }, [position]);

  /** Glides along x with an ease-out (no bounce), quicker after a fast flick; y settles alongside. */
  const glideTo = useCallback((x: number, y: number, speed = 0) => {
    const distance = Math.abs(x - current.current.x);
    const duration = Math.max(180, Math.min(320, distance / Math.max(0.9, Math.abs(speed))));
    Animated.parallel([
      Animated.timing(position.x, { toValue: x, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(position.y, { toValue: y, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    return duration;
  }, [position]);

  const tuck = useCallback((next: FloatingCallSide, y: number, speed = 0) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSide(next);
    const duration = glideTo(floatingCallTuckX(next, boundsRef.current.screenWidth, boundsRef.current.width), y, speed);
    Animated.timing(shown, { toValue: 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [glideTo, shown]);

  const untuck = useCallback(() => {
    const from = sideRef.current;
    if (!from) return;
    void Haptics.selectionAsync();
    setSide(null);
    const duration = glideTo(floatingCallRestX(from, boundsRef.current.screenWidth, boundsRef.current.width), current.current.y);
    Animated.timing(shown, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [glideTo, shown]);

  // Rotation or a new card height: keep it on screen (or tucked).
  useEffect(() => {
    const { x, y } = current.current;
    position.setValue({
      x: side
        ? floatingCallTuckX(side, bounds.screenWidth, bounds.width)
        : Math.min(Math.max(x, FLOATING_CALL_EDGE), bounds.screenWidth - bounds.width - FLOATING_CALL_EDGE),
      y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
    });
  }, [bounds, position, side]);

  const dragStart = useRef({ x: 0, y: 0 });
  const responder = useRef(PanResponder.create({
    // Buttons keep taps; a real drag (from anywhere on the card) moves it.
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
    onPanResponderGrant: () => {
      position.stopAnimation();
      dragStart.current = { ...current.current };
    },
    onPanResponderMove: (_, gesture) => {
      const { minY, maxY } = boundsRef.current;
      position.setValue({
        x: dragStart.current.x + gesture.dx,
        y: Math.min(Math.max(dragStart.current.y + gesture.dy, minY), maxY),
      });
    },
    onPanResponderRelease: (_, gesture) => {
      const { screenWidth: sw, width: w, minY, maxY } = boundsRef.current;
      const x = dragStart.current.x + gesture.dx;
      const y = Math.min(Math.max(current.current.y, minY), maxY);
      const sideways = Math.abs(gesture.vx) > Math.abs(gesture.vy);
      // Tucks a little past the edge, or on a gentle sideways flick.
      if (x + w - sw > w * TUCK_OVERFLOW || (sideways && gesture.vx >= TUCK_VELOCITY)) {
        tuck('right', y, gesture.vx);
      } else if (-x > w * TUCK_OVERFLOW || (sideways && gesture.vx <= -TUCK_VELOCITY)) {
        tuck('left', y, gesture.vx);
      } else {
        moveTo(Math.min(Math.max(x, FLOATING_CALL_EDGE), sw - w - FLOATING_CALL_EDGE), y);
      }
    },
    onPanResponderTerminate: () => {
      const { x, y } = current.current;
      const { screenWidth: sw, width: w } = boundsRef.current;
      moveTo(Math.min(Math.max(x, FLOATING_CALL_EDGE), sw - w - FLOATING_CALL_EDGE), y);
    },
  })).current;

  // The tab: tap it, or pull it inward, to bring the card back.
  const nudgeResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderRelease: (_, gesture) => {
      const pulledIn = sideRef.current === 'right' ? gesture.dx < -12 : gesture.dx > 12;
      const tapped = Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6;
      if (pulledIn || tapped) untuck();
    },
  })).current;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setHeight((previous) => (previous === next ? previous : next));
  }, []);

  const expand = useCallback(() => {
    void Haptics.selectionAsync();
    open();
  }, [open]);

  const handlePause = useCallback(() => {
    void Haptics.selectionAsync();
    togglePause();
  }, [togglePause]);

  const handleDone = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    done();
  }, [done]);

  const time = formatVoiceCallDuration(duration);
  const status = saving ? 'Saving…' : isPaused ? 'Paused' : 'Recording';
  const live = recordingLive && !isPaused;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        {...responder.panHandlers}
        onLayout={handleLayout}
        accessibilityElementsHidden={Boolean(side)}
        importantForAccessibility={side ? 'no-hide-descendants' : 'auto'}
        style={[styles.card, { width, opacity: shown.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: position.getTranslateTransform() }]}
      >
        {/* Tapping the card, outside its buttons, opens the recorder again. */}
        <Pressable
          onPress={expand}
          accessibilityRole="button"
          accessibilityLabel={`Open recorder, ${time}, ${status}`}
          style={[StyleSheet.absoluteFill, styles.cardTap]}
        />
        <View pointerEvents="none" style={styles.icon}>
          <AudioLines size={22} color={colors.textStrong} />
        </View>
        <View pointerEvents="none" style={styles.info}>
          <Text style={[TYPE.stat, styles.time]}>{time}</Text>
          <View style={styles.statusRow} accessibilityLiveRegion="polite">
            <View style={[styles.dot, { backgroundColor: live ? colors.success : colors.textMuted }]} />
            <Text numberOfLines={1} style={[TYPE.bodySmall, styles.status]}>{status}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={handlePause}
            disabled={!recordingLive}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'}
            accessibilityState={{ disabled: !recordingLive }}
            style={[styles.round, styles.pause, !recordingLive && styles.disabled]}
          >
            {isPaused
              ? <Play size={20} color={colors.textStrong} fill={colors.textStrong} />
              : <Pause size={20} color={colors.textStrong} fill={colors.textStrong} strokeWidth={0} />}
          </Pressable>
          <Pressable
            onPress={handleDone}
            disabled={!recordingLive}
            accessibilityRole="button"
            accessibilityLabel="Done, save recording"
            accessibilityState={{ disabled: !recordingLive, busy: saving }}
            style={[styles.round, styles.done]}
          >
            {saving
              ? <ActivityIndicator color={colors.textInverse} />
              : <Check size={22} color={colors.textInverse} strokeWidth={2.4} />}
          </Pressable>
        </View>
      </Animated.View>

      {side && (
        <Animated.View
          {...nudgeResponder.panHandlers}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Show recorder, ${time}, ${status}`}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={untuck}
          style={[
            styles.nudge,
            side === 'right' ? styles.nudgeRight : styles.nudgeLeft,
            {
              top: Animated.add(position.y, (height - FLOATING_CALL_NUDGE_HEIGHT) / 2),
              // Slides in from the edge as the card leaves.
              opacity: shown.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }),
              transform: [{
                translateX: shown.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, side === 'right' ? FLOATING_CALL_NUDGE_WIDTH : -FLOATING_CALL_NUDGE_WIDTH],
                }),
              }],
            },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: live ? colors.success : colors.textMuted }]} />
          <View style={styles.grip} />
        </Animated.View>
      )}
    </View>
  );
}

const ROUND = 48;
/** Tucks once this share of the card is past an edge (the voice card needs 30%)… */
const TUCK_OVERFLOW = 0.2;
/** …or on a sideways flick at least this fast, in points per ms (the voice card needs 1.2). */
const TUCK_VELOCITY = 0.5;
const CARD_RADIUS = 24;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.strokeWeak,
    backgroundColor: colors.sheet,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 12,
  },
  cardTap: { borderRadius: CARD_RADIUS },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fillWeak,
  },
  info: { flex: 1, minWidth: 0, gap: 2 },
  time: { color: colors.textStrong, fontVariant: ['tabular-nums'] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { color: colors.textWeak, flexShrink: 1 },
  controls: { flexDirection: 'row', gap: 12 },
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: 'center', justifyContent: 'center' },
  pause: { borderWidth: 1, borderColor: colors.strokeWeak, backgroundColor: colors.fillWeak },
  done: { backgroundColor: colors.brand },
  disabled: { opacity: 0.5 },
  nudge: {
    position: 'absolute',
    width: FLOATING_CALL_NUDGE_WIDTH,
    height: FLOATING_CALL_NUDGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.sheet,
    borderWidth: 1,
    borderColor: colors.strokeWeak,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  nudgeRight: { right: 0, borderTopLeftRadius: 16, borderBottomLeftRadius: 16, borderRightWidth: 0 },
  nudgeLeft: { left: 0, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderLeftWidth: 0 },
  grip: { width: 4, height: 20, borderRadius: 2, backgroundColor: colors.strokeStrong },
});
