import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Mic from 'lucide-react-native/icons/mic';
import MicOff from 'lucide-react-native/icons/mic-off';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import PhoneOff from 'lucide-react-native/icons/phone-off';
import Settings2 from 'lucide-react-native/icons/settings-2';
import { Pressable } from '@/components/ui/Touchable';
import { VoiceArtwork } from '@/components/chat/VoiceArtwork';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { hasDynamicIsland, isCallLive, islandCapsuleFrame } from '@/features/chat/call-indicator';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { VOICE_CATALOG, getVoiceById, type VoiceId } from '@/features/chat/voice-catalog';
import {
  FLOATING_CALL_EDGE,
  FLOATING_CALL_NUDGE_HEIGHT,
  FLOATING_CALL_NUDGE_WIDTH,
  floatingCallRestX,
  floatingCallTuckX,
  floatingCallWidth,
  resolveFloatingCallRelease,
  type FloatingCallTuck,
} from '@/features/chat/floating-call-position';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { useVoiceCall, VOICE_CALL_PATH } from '@/hooks/use-voice-call';
import { useAuthStore, useUiStore } from '@/store';

/** The card waits above the screen while the call is in the Dynamic Island. */
const ISLAND_HIDDEN_Y = -400;

/** Web `Voiceinput.tsx` floating variant status line. */
function callStatus(voice: { isConnecting: boolean; isReconnecting: boolean; isMuted: boolean; isThinking: boolean; isConnected: boolean }) {
  if (voice.isConnecting) return 'Connecting…';
  if (voice.isReconnecting) return 'Reconnecting…';
  if (!voice.isConnected) return 'Ready to connect';
  if (voice.isMuted) return 'You’re muted';
  if (voice.isThinking) return 'Thinking…';
  return 'Listening';
}

/**
 * The live call, floating over every screen: mobile port of web's floating
 * voice session. Drag it anywhere. On Dynamic Island iPhones the call prefers
 * the island: it starts there, tapping it opens the card, and pushing the card
 * away (sideways or up) puts it back. Elsewhere, pushing it past the left or
 * right edge tucks it away, leaving a small tab to pull it back. It sits in a window above
 * native full-screen pages and sheets (iOS), and lives at the app root, so it
 * stays put across navigation.
 */
export function FloatingVoiceCall() {
  const { voice } = useVoiceCall();
  const pathname = usePathname();
  const active = voice.isConnecting || voice.isReconnecting || isCallLive(voice);
  if (!active || pathname === VOICE_CALL_PATH) return null;
  const card = <FloatingVoiceCallCard />;
  return Platform.OS === 'ios' ? (
    <FullWindowOverlay>{card}</FullWindowOverlay>
  ) : (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{card}</View>
  );
}

function FloatingVoiceCallCard() {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const { voice, config, startCall } = useVoiceCall();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const width = floatingCallWidth(screenWidth);
  const [height, setHeight] = useState(96);
  const island = hasDynamicIsland(Platform.OS, insets.top);
  // Island iPhones start in the island, like the system's own call.
  const [side, setSide] = useState<FloatingCallTuck | null>(island ? 'island' : null);

  const bounds = useMemo(() => ({
    screenWidth,
    width,
    minY: insets.top + FLOATING_CALL_EDGE,
    maxY: Math.max(insets.top + FLOATING_CALL_EDGE, screenHeight - insets.bottom - height - FLOATING_CALL_EDGE),
  }), [height, insets.bottom, insets.top, screenHeight, screenWidth, width]);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  // Opens top right, below the header, like web.
  const restY = insets.top + 64;
  const start = { x: floatingCallRestX('right', screenWidth, width), y: island ? ISLAND_HIDDEN_Y : restY };
  const position = useRef(new Animated.ValueXY(start)).current;
  const current = useRef(start);
  // Where the card was before going into the island, to open it there again.
  const lastRestY = useRef(restY);
  useEffect(() => {
    const id = position.addListener((value) => { current.current = value; });
    return () => position.removeListener(id);
  }, [position]);
  const sideRef = useRef(side);
  sideRef.current = side;
  const islandRef = useRef(island);
  islandRef.current = island;

  const moveTo = useCallback((x: number, y: number) => {
    Animated.spring(position, { toValue: { x, y }, useNativeDriver: false, bounciness: 4, speed: 16 }).start();
  }, [position]);

  const tuck = useCallback((next: FloatingCallTuck, x: number, y: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSide(next);
    if (next === 'island') {
      lastRestY.current = y;
      moveTo(x, ISLAND_HIDDEN_Y);
    } else {
      moveTo(floatingCallTuckX(next, boundsRef.current.screenWidth, boundsRef.current.width), y);
    }
  }, [moveTo]);

  const untuck = useCallback(() => {
    const from = sideRef.current;
    if (!from) return;
    void Haptics.selectionAsync();
    setSide(null);
    const { screenWidth: sw, width: w, minY, maxY } = boundsRef.current;
    if (from === 'island') {
      moveTo(floatingCallRestX('right', sw, w), Math.min(Math.max(lastRestY.current, minY), maxY));
    } else {
      moveTo(floatingCallRestX(from, sw, w), current.current.y);
    }
  }, [moveTo]);

  // Rotation or a new card height: keep it on screen.
  useEffect(() => {
    const { x, y } = current.current;
    if (side === 'island') return;
    const clampedY = Math.min(Math.max(y, bounds.minY), bounds.maxY);
    const nextX = side
      ? floatingCallTuckX(side, bounds.screenWidth, bounds.width)
      : Math.min(Math.max(x, FLOATING_CALL_EDGE), bounds.screenWidth - bounds.width - FLOATING_CALL_EDGE);
    position.setValue({ x: nextX, y: clampedY });
  }, [bounds, position, side]);

  const dragStart = useRef({ x: 0, y: 0 });
  const cardResponder = useRef(PanResponder.create({
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
      const release = resolveFloatingCallRelease({
        x: dragStart.current.x + gesture.dx,
        y: current.current.y,
        vx: gesture.vx,
        vy: gesture.vy,
        island: islandRef.current,
        ...boundsRef.current,
      });
      if (release.tuck) tuck(release.tuck, release.x, release.y);
      else moveTo(release.x, release.y);
    },
    onPanResponderTerminate: () => {
      const { x, y } = current.current;
      const { screenWidth: sw, width: w } = boundsRef.current;
      moveTo(Math.min(Math.max(x, FLOATING_CALL_EDGE), sw - w - FLOATING_CALL_EDGE), y);
    },
  })).current;

  // The tab: tap it, or pull it inward, to bring the call back.
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

  const voiceDefinition = VOICE_CATALOG.find((choice) => choice.providerVoiceName === config.voiceName) ?? VOICE_CATALOG[0];
  const live = isCallLive(voice);
  const status = callStatus(voice);
  const time = formatVoiceCallDuration(voice.recordingTime);

  const toggleMute = useCallback(() => {
    void Haptics.selectionAsync();
    voice.toggleMute();
  }, [voice]);

  const end = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!live) {
      void voice.disconnect();
      return;
    }
    useUiStore.getState().openSheet('end-voice-session', {
      duration: voice.recordingTime,
      onEnd: () => voice.disconnect(),
    });
  }, [live, voice]);

  const openSettings = useCallback(() => {
    void Haptics.selectionAsync();
    useUiStore.getState().openSheet('voice-call-settings', {
      userKey: user?._id ?? user?.email ?? 'anonymous',
      selectedVoiceId: voiceDefinition.id,
      // As on web, a new voice restarts the call with it.
      onSaved: async (id: VoiceId) => {
        const next = getVoiceById(id);
        if (!next) return;
        await voice.disconnect();
        startCall({ memoryId: config.memoryId, voiceName: next.providerVoiceName });
      },
    });
  }, [config.memoryId, startCall, user?._id, user?.email, voice, voiceDefinition.id]);

  const dotColor = voice.isMuted ? colors.error : colors.success;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        {...cardResponder.panHandlers}
        onLayout={handleLayout}
        accessibilityElementsHidden={Boolean(side)}
        importantForAccessibility={side ? 'no-hide-descendants' : 'auto'}
        style={[styles.card, { width, transform: position.getTranslateTransform() }]}
      >
        {/* Tapping anywhere on the card, outside the call buttons, opens the voice settings. */}
        <Pressable
          onPress={openSettings}
          accessibilityRole="button"
          accessibilityLabel="Voice call settings"
          style={[StyleSheet.absoluteFill, styles.cardTap]}
        />
        <Pressable
          onPress={voice.isAiSpeaking ? voice.interrupt : openSettings}
          accessibilityRole="button"
          accessibilityLabel={voice.isAiSpeaking ? 'Stop Memento speaking' : 'Voice call settings'}
        >
          <VoiceArtwork voice={voiceDefinition} size={48} />
        </Pressable>
        {/* Not touchable itself, so taps here reach the card's settings press. */}
        <View pointerEvents="none" style={styles.info}>
          <View style={styles.timeRow}>
            <Text style={[TYPE.stat, styles.time]} accessibilityLabel={`Call time ${time}`}>{time}</Text>
            <View style={styles.settings}>
              <Settings2 size={16} color={colors.textWeak} />
            </View>
          </View>
          <View style={styles.statusRow} accessibilityLiveRegion="polite">
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text numberOfLines={1} style={[TYPE.bodySmall, styles.status]}>{status}</Text>
            {voice.isRecordingCall && (
              // The conversation is being recorded and will be saved to Stories.
              <View style={styles.recording} accessibilityLabel="Recording">
                <View style={[styles.dot, { backgroundColor: colors.error }]} />
                <Text numberOfLines={1} style={[TYPE.bodySmall, { color: colors.error }]}>Rec</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={toggleMute}
            disabled={!live}
            accessibilityRole="button"
            accessibilityLabel={voice.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            accessibilityState={{ disabled: !live, selected: voice.isMuted }}
            style={[styles.round, styles.mute, !live && styles.disabled]}
          >
            {voice.isMuted
              ? <MicOff size={22} color={colors.error} />
              : <Mic size={22} color={colors.textStrong} />}
          </Pressable>
          <Pressable
            onPress={end}
            accessibilityRole="button"
            accessibilityLabel="End call"
            style={[styles.round, styles.end]}
          >
            <PhoneOff size={22} color={colors.error} />
          </Pressable>
        </View>
      </Animated.View>

      {side === 'island' && (
        <IslandCapsule
          topInset={insets.top}
          time={time}
          status={status}
          muted={voice.isMuted}
          speaking={voice.isAiSpeaking}
          recording={voice.isRecordingCall}
          onPress={untuck}
        />
      )}

      {(side === 'left' || side === 'right') && (
        <Animated.View
          {...nudgeResponder.panHandlers}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Show voice call, ${time}, ${status}`}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={untuck}
          style={[
            styles.nudge,
            side === 'right' ? styles.nudgeRight : styles.nudgeLeft,
            { top: Animated.add(position.y, (height - FLOATING_CALL_NUDGE_HEIGHT) / 2) },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <View style={styles.grip} />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * On island iPhones the call waits in the Dynamic Island: a black capsule that
 * makes the island look like it grew to show the call. Tap it to open the card.
 */
function IslandCapsule({ topInset, time, status, muted, speaking, recording, onPress }: {
  topInset: number;
  time: string;
  status: string;
  muted: boolean;
  speaking: boolean;
  recording: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const frame = islandCapsuleFrame(topInset);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: frame.top, left: 0, right: 0, alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Show voice call, ${time}, ${status}${recording ? ', recording' : ''}`}
        onPress={onPress}
        style={{
          width: frame.width,
          height: frame.height,
          borderRadius: frame.radius,
          backgroundColor: colors.dynamicIsland,
          justifyContent: 'flex-end',
          paddingBottom: 5,
        }}
      >
        <View style={{ height: frame.rowHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {muted
            ? <MicOff size={16} color={colors.error} />
            : <AudioLines size={16} color={speaking ? colors.brand : colors.success} />}
          {/* Fixed height: large text sizes are capped; the label reads the time. */}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={[TYPE.label, { color: colors.mediaText, fontVariant: ['tabular-nums'] }]}
          >
            {time}
          </Text>
          {recording && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error }} />}
        </View>
      </Pressable>
    </View>
  );
}

const ROUND = 48;

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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.strokeWeak,
    backgroundColor: colors.sheet,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 12,
  },
  cardTap: { borderRadius: 24 },
  info: { flex: 1, minWidth: 0, gap: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { color: colors.textStrong, fontVariant: ['tabular-nums'] },
  settings: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { color: colors.textWeak, flexShrink: 1 },
  recording: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 },
  controls: { flexDirection: 'row', gap: 12 },
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: 'center', justifyContent: 'center' },
  mute: { borderWidth: 1, borderColor: colors.strokeWeak, backgroundColor: colors.fillWeak },
  end: { backgroundColor: colors.errorFill, borderWidth: 1, borderColor: colors.errorFill },
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
