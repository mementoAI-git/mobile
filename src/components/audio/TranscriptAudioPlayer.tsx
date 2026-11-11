/**
 * TranscriptAudioPlayer — the audio slide of MediaPreviewModal.
 *
 * Layout (top to bottom):
 *  - Transcript of the recording, streaming word by word with playback and
 *    auto-scrolling to the active turn (artwork or a voice visual otherwise)
 *  - Speaker-coloured timeline with a playhead; tap or drag to seek
 *  - Elapsed `mm:ss` and remaining `-mm:ss`
 *  - Speed, back 5s, play/pause, forward 5s
 *
 * Pure logic lives in `src/features/audio/transcript-player.ts`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import Mic from 'lucide-react-native/icons/mic';
import Music from 'lucide-react-native/icons/music';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Captions from 'lucide-react-native/icons/captions';
import CaptionsOff from 'lucide-react-native/icons/captions-off';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Spinner } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import type { COLORS as LIGHT_COLORS } from '@/constants/tokens';
import { iconSize } from '@/constants/responsive';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { useFileTranscription } from '@/hooks/queries/use-file-transcription';
import { useResolvedAudioArtworkThumbnail } from '@/features/media/audio-artwork';
import { getNextPlaybackSpeed, type PlaybackSpeed } from '@/features/audio/narration-player';
import {
  SKIP_SECONDS,
  clampSkip,
  computeTimelineBlocks,
  findActiveIndex,
  formatClock,
  formatRemaining,
  fractionFromX,
  hasSpeakers,
  isVoiceRecording,
  mergeTranscriptTurns,
  resolveTimelineDuration,
  speakerLabel,
  spokenCharCount,
  type TranscriptSegment,
  type TranscriptTurn,
} from '@/features/audio/transcript-player';

type ThemeColors = typeof LIGHT_COLORS;

/** How long auto-scroll stays out of the way after the user scrolls. */
const MANUAL_SCROLL_PAUSE_MS = 4000;
/** Where the active turn sits in the transcript viewport (fraction from the top). */
const ACTIVE_TURN_ANCHOR = 0.3;
const FADE_HEIGHT = 40;
const TRACK_HEIGHT = 14;
const PLAYHEAD_HEIGHT = 28;
const PLAYHEAD_WIDTH = 3;
const SKIP_BUTTON_SIZE = 64;
const PLAY_BUTTON_SIZE = 80;
/** Treat the last moment of the file as the end, so play restarts from 0. */
const END_EPSILON_SECONDS = 0.25;
const SEEK_TOLERANCE_MS = 50;

export interface TranscriptAudioPlayerProps {
  uri: string;
  name?: string;
  mimeType: string;
  isVoice?: boolean;
  thumbnailUrl?: string | null;
  /** Known duration in seconds, shown until the player loads. */
  duration?: number;
  /** Persisted File id; transcripts are only requested for saved voice recordings. */
  fileId?: string;
  isActive: boolean;
  /** Lets the parent pager stop swiping while the timeline is being dragged. */
  onScrubbingChange?: (scrubbing: boolean) => void;
}

/** Speech on the timeline is purple; the plain track between it is silence. */
function speechColor(colors: ThemeColors) {
  return colors.summaryPurpleText;
}

// ─── Transcript ───────────────────────────────────────────────────────────────

type TurnState = 'past' | 'active' | 'future';

interface TranscriptTurnRowProps {
  turn: TranscriptTurn;
  index: number;
  state: TurnState;
  /** Characters of the active turn already spoken. */
  spoken: number;
  showSpeaker: boolean;
  onSeek: (index: number) => void;
  onRowLayout: (index: number, y: number) => void;
}

const TranscriptTurnRow = React.memo(function TranscriptTurnRow({
  turn,
  index,
  state,
  spoken,
  showSpeaker,
  onSeek,
  onRowLayout,
}: TranscriptTurnRowProps) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const label = showSpeaker ? speakerLabel(turn.speaker) : null;
  const handlePress = useCallback(() => onSeek(index), [index, onSeek]);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => onRowLayout(index, event.nativeEvent.layout.y),
    [index, onRowLayout],
  );
  const restColor = state === 'past' ? colors.textWeak : colors.textMuted;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLayout={handleLayout}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label ? `${label}, ` : ''}${formatClock(turn.start)}. ${turn.text}`}
      accessibilityHint="Plays from here"
      voiceLabel={false}
      style={styles.turn}
    >
      <View style={styles.turnLabelRow}>
        {label ? (
          <Text style={[styles.turnSpeaker, { color: state === 'active' ? colors.textStrong : colors.textWeak }]}>
            {label}
          </Text>
        ) : null}
        <Text style={styles.turnTime}>{formatClock(turn.start)}</Text>
      </View>
      {state === 'active' ? (
        <Text style={styles.turnText}>
          <Text style={{ color: colors.textStrong }}>{turn.text.slice(0, spoken)}</Text>
          <Text style={{ color: colors.textWeak }}>{turn.text.slice(spoken)}</Text>
        </Text>
      ) : (
        <Text style={[styles.turnText, { color: restColor }]}>{turn.text}</Text>
      )}
    </TouchableOpacity>
  );
});

function TranscriptView({
  turns,
  currentTime,
  showSpeakers,
  onSeek,
}: {
  turns: TranscriptTurn[];
  currentTime: number;
  showSpeakers: boolean;
  onSeek: (seconds: number) => void;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const rowOffsets = useRef<number[]>([]);
  const viewportHeight = useRef(0);
  const userScrolling = useRef(false);
  const lastManualScrollAt = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeIndex = findActiveIndex(turns, currentTime);
  // Before the first word, keep the first turn in focus.
  const focusIndex = Math.max(0, activeIndex);
  const activeSpoken = activeIndex >= 0 ? spokenCharCount(turns[activeIndex], currentTime) : 0;

  const scrollToTurn = useCallback((index: number, animated = true) => {
    const y = rowOffsets.current[index];
    if (y === undefined || !scrollRef.current) return;
    const target = Math.max(0, y - viewportHeight.current * ACTIVE_TURN_ANCHOR);
    scrollRef.current.scrollTo({ y: target, animated });
  }, []);

  const focusIndexRef = useRef(focusIndex);
  focusIndexRef.current = focusIndex;

  // Follow the active turn unless the user has just scrolled the transcript.
  useEffect(() => {
    if (userScrolling.current) return;
    if (Date.now() - lastManualScrollAt.current < MANUAL_SCROLL_PAUSE_MS) return;
    scrollToTurn(focusIndex);
  }, [focusIndex, scrollToTurn]);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const handleScrollBegin = useCallback(() => {
    userScrolling.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const handleScrollEnd = useCallback((_event?: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!userScrolling.current) return;
    userScrolling.current = false;
    lastManualScrollAt.current = Date.now();
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    // Once the pause is over, glide back to wherever playback has got to.
    resumeTimer.current = setTimeout(() => {
      if (!userScrolling.current) scrollToTurn(focusIndexRef.current);
    }, MANUAL_SCROLL_PAUSE_MS);
  }, [scrollToTurn]);

  const handleRowLayout = useCallback((index: number, y: number) => {
    rowOffsets.current[index] = y;
    // First layout: settle on the active turn without animating.
    if (index === focusIndexRef.current && lastManualScrollAt.current === 0 && !userScrolling.current) {
      scrollToTurn(index, false);
    }
  }, [scrollToTurn]);

  const handleSeekTurn = useCallback((index: number) => {
    Haptics.selectionAsync();
    lastManualScrollAt.current = 0;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    onSeek(turns[index]?.start ?? 0);
  }, [onSeek, turns]);

  return (
    // Faded at the edges with a mask, so it blends into any background (plain or sky).
    <MaskedView
      style={styles.transcript}
      maskElement={(
        <LinearGradient
          colors={['transparent', '#000000', '#000000', 'transparent']}
          locations={[0, 0.12, 0.88, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
    >
      <ScrollView
        ref={scrollRef}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={styles.transcriptContent}
        showsVerticalScrollIndicator={false}
        onLayout={(event) => { viewportHeight.current = event.nativeEvent.layout.height; }}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={32}
      >
        {turns.map((turn, index) => (
          <TranscriptTurnRow
            key={turn.id}
            turn={turn}
            index={index}
            state={index === activeIndex ? 'active' : index < activeIndex ? 'past' : 'future'}
            spoken={index === activeIndex ? activeSpoken : 0}
            showSpeaker={showSpeakers}
            onSeek={handleSeekTurn}
            onRowLayout={handleRowLayout}
          />
        ))}
      </ScrollView>
    </MaskedView>
  );
}

// ─── Visual fallback (music, untranscribed audio) ─────────────────────────────

function AudioVisual({ artworkUri, voice, title }: { artworkUri?: string | null; voice: boolean; title: string }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const Icon = voice ? Mic : Music;
  return (
    <View style={styles.visual}>
      {artworkUri ? (
        <Image source={{ uri: artworkUri }} style={styles.artwork} resizeMode="cover" />
      ) : (
        <View style={styles.visualTile}>
          <Icon size={iconSize(44)} color={colors.brand} strokeWidth={1.6} />
        </View>
      )}
      <Text style={styles.visualTitle} numberOfLines={2}>{title}</Text>
    </View>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({
  segments,
  duration,
  currentTime,
  onScrub,
  onSeek,
  onScrubbingChange,
}: {
  /** Spans where someone was speaking. */
  segments: { start: number; end: number }[];
  duration: number;
  currentTime: number;
  onScrub: (seconds: number | null) => void;
  onSeek: (seconds: number) => void;
  onScrubbingChange?: (scrubbing: boolean) => void;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const [width, setWidth] = useState(0);
  const blocks = useMemo(() => computeTimelineBlocks(segments, duration), [segments, duration]);
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  // The PanResponder lives in a ref, so it reads the latest values from here.
  const latest = useRef({ width, duration, onScrub, onSeek, onScrubbingChange });
  latest.current = { width, duration, onScrub, onSeek, onScrubbingChange };
  const trackOriginX = useRef(0);
  const timeAtPageX = (pageX: number) =>
    fractionFromX(pageX - trackOriginX.current, latest.current.width) * latest.current.duration;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event) => {
        // locationX drifts once the finger leaves the track, so measure moves from the page.
        trackOriginX.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
        latest.current.onScrubbingChange?.(true);
        Haptics.selectionAsync();
        latest.current.onScrub(timeAtPageX(event.nativeEvent.pageX));
      },
      onPanResponderMove: (_event, gesture) => {
        latest.current.onScrub(timeAtPageX(gesture.moveX));
      },
      onPanResponderRelease: (_event, gesture) => {
        latest.current.onSeek(timeAtPageX(gesture.moveX || gesture.x0));
        latest.current.onScrub(null);
        latest.current.onScrubbingChange?.(false);
      },
      onPanResponderTerminate: () => {
        latest.current.onScrub(null);
        latest.current.onScrubbingChange?.(false);
      },
    }),
  ).current;

  return (
    <View
      style={styles.timelineHitArea}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Playback position"
      accessibilityValue={{ text: `${formatClock(currentTime)} of ${formatClock(duration)}` }}
      {...responder.panHandlers}
    >
      <View pointerEvents="none" style={styles.track}>
        {segments.length ? (
          blocks.map((block) => (
            <View
              key={block.key}
              style={[
                styles.block,
                {
                  left: `${block.left * 100}%`,
                  width: `${block.width * 100}%`,
                  backgroundColor: speechColor(colors),
                },
              ]}
            />
          ))
        ) : (
          <View style={[styles.block, { left: 0, width: `${progress * 100}%`, backgroundColor: colors.mediaText }]} />
        )}
      </View>
      {width > 0 ? (
        <View
          pointerEvents="none"
          style={[styles.playhead, { transform: [{ translateX: progress * width - PLAYHEAD_WIDTH / 2 }] }]}
        />
      ) : null}
    </View>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────

function SkipButton({ direction, onPress }: { direction: 'back' | 'forward'; onPress: () => void }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const Icon = direction === 'back' ? RotateCcw : RotateCw;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={direction === 'back' ? `Back ${SKIP_SECONDS} seconds` : `Forward ${SKIP_SECONDS} seconds`}
      style={styles.skipButton}
    >
      <Icon size={iconSize(30)} color={colors.textStrong} strokeWidth={1.8} />
      <Text style={styles.skipLabel}>{SKIP_SECONDS}</Text>
    </TouchableOpacity>
  );
}

// ─── Player ───────────────────────────────────────────────────────────────────

export function TranscriptAudioPlayer({
  uri,
  name,
  mimeType,
  isVoice,
  thumbnailUrl,
  duration: knownDuration,
  fileId,
  isActive,
  onScrubbingChange,
}: TranscriptAudioPlayerProps) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const player = useAudioPlayer(uri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  // Shown between a seek and the player reporting the new position, so the playhead never jumps back.
  const [pendingSeek, setPendingSeek] = useState<number | null>(null);

  const voice = isVoiceRecording({ isVoice, name });
  // The transcript shows by default for voice recordings and can be toggled for any saved audio.
  const [showTranscript, setShowTranscript] = useState(voice);
  const canTranscribe = Boolean(fileId);
  const transcription = useFileTranscription(fileId, showTranscript && isActive);
  const segments = useMemo(() => transcription.data?.segments ?? [], [transcription.data]);
  const turns = useMemo(() => mergeTranscriptTurns(segments), [segments]);
  const multiSpeaker = useMemo(() => hasSpeakers(segments), [segments]);
  // Recorded conversations know when someone was audible; otherwise the transcript segments stand in.
  const speechSpans = useMemo(
    () => (transcription.data?.speech.length ? transcription.data.speech : segments),
    [transcription.data, segments],
  );
  const toggleTranscript = useCallback(() => {
    Haptics.selectionAsync();
    setShowTranscript((shown) => !shown);
  }, []);

  const artworkUri = useResolvedAudioArtworkThumbnail({
    uri,
    mimeType,
    name,
    backendThumbnail: thumbnailUrl,
    enabled: !voice,
  });

  const duration = resolveTimelineDuration(status.duration || knownDuration || 0, segments);
  const currentTime = scrubTime ?? pendingSeek ?? status.currentTime ?? 0;
  const ended = duration > 0 && status.currentTime >= duration - END_EPSILON_SECONDS && !status.playing;

  // Pause when the slide scrolls out of view.
  useEffect(() => {
    if (!isActive && player.playing) player.pause();
  }, [isActive, player]);

  // Pause on unmount.
  useEffect(() => () => {
    try { player.pause(); } catch {}
  }, [player]);

  useEffect(() => {
    try { player.setPlaybackRate(speed); } catch {}
  }, [player, speed]);

  // The status time when the last seek was issued; any newer report replaces the pending value.
  const seekIssuedAt = useRef<number | null>(null);
  useEffect(() => {
    if (pendingSeek === null || seekIssuedAt.current === null) return;
    const reported = status.currentTime ?? 0;
    if (Math.abs(reported - seekIssuedAt.current) > 0.01 || Math.abs(reported - pendingSeek) < 0.5) {
      seekIssuedAt.current = null;
      setPendingSeek(null);
    }
  }, [pendingSeek, status.currentTime]);

  const seekTo = useCallback((seconds: number) => {
    const target = clampSkip(seconds, 0, duration);
    seekIssuedAt.current = player.currentTime ?? 0;
    setPendingSeek(target);
    // Tight tolerance so a tapped turn starts on its first word (iOS defaults to the nearest keyframe).
    void player.seekTo(target, SEEK_TOLERANCE_MS, SEEK_TOLERANCE_MS);
  }, [duration, player]);

  const handlePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (player.playing) {
      player.pause();
      return;
    }
    if (ended) seekTo(0);
    player.play();
  }, [ended, player, seekTo]);

  const handleSkip = useCallback((delta: number) => {
    Haptics.selectionAsync();
    seekTo((player.currentTime ?? 0) + delta);
  }, [player, seekTo]);
  const handleBack = useCallback(() => handleSkip(-SKIP_SECONDS), [handleSkip]);
  const handleForward = useCallback(() => handleSkip(SKIP_SECONDS), [handleSkip]);

  const handleSpeed = useCallback(() => {
    Haptics.selectionAsync();
    setSpeed((current) => getNextPlaybackSpeed(current));
  }, []);

  const title = voice
    ? 'Voice note'
    : name?.replace(/\.[^.]+$/, '').replace(/_\d{12,}$/, '').replace(/_/g, ' ') || 'Audio';

  let body: React.ReactNode;
  if (showTranscript && transcription.isLoading) {
    body = (
      <View style={styles.visual}>
        <Spinner size="small" color={colors.brand} />
        <Text style={styles.statusText}>Transcribing…</Text>
      </View>
    );
  } else if (showTranscript && turns.length) {
    body = (
      <TranscriptView
        turns={turns}
        currentTime={currentTime}
        showSpeakers={multiSpeaker}
        onSeek={seekTo}
      />
    );
  } else {
    body = <AudioVisual artworkUri={voice ? null : artworkUri} voice={voice} title={title} />;
  }

  const playing = status.playing;

  return (
    <View style={styles.root}>
      <View style={styles.body}>{body}</View>

      <View style={styles.timelineSection}>
        <Timeline
          segments={speechSpans}
          duration={duration}
          currentTime={currentTime}
          onScrub={setScrubTime}
          onSeek={seekTo}
          onScrubbingChange={onScrubbingChange}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatClock(currentTime)}</Text>
          <Text style={styles.timeText}>{formatRemaining(currentTime, duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handleSpeed}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${speed}x`}
          style={styles.speedButton}
        >
          <Text style={styles.speedText}>{`${speed}x`}</Text>
        </TouchableOpacity>
        <SkipButton direction="back" onPress={handleBack} />
        <TouchableOpacity
          onPress={handlePlayPause}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause' : 'Play'}
          style={styles.playButton}
        >
          {playing ? (
            <Pause size={iconSize(30)} color={colors.mediaSurface} fill={colors.mediaSurface} strokeWidth={0} />
          ) : (
            <Play size={iconSize(30)} color={colors.mediaSurface} fill={colors.mediaSurface} strokeWidth={0} style={styles.playIcon} />
          )}
        </TouchableOpacity>
        <SkipButton direction="forward" onPress={handleForward} />
        {canTranscribe ? (
          <TouchableOpacity
            onPress={toggleTranscript}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityState={{ checked: showTranscript }}
            accessibilityLabel="Transcript"
            style={styles.speedButton}
          >
            {showTranscript
              ? <Captions size={iconSize(24)} color={colors.textStrong} strokeWidth={1.8} />
              : <CaptionsOff size={iconSize(24)} color={colors.textWeak} strokeWidth={1.8} />}
          </TouchableOpacity>
        ) : (
          // Empty slot balances the speed button so play stays centred.
          <View style={styles.speedButton} />
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 20,
  },
  body: {
    flex: 1,
  },
  transcript: {
    flex: 1,
  },
  transcriptContent: {
    paddingTop: FADE_HEIGHT,
    paddingBottom: FADE_HEIGHT * 3,
    gap: 24,
  },
  turn: {
    gap: 6,
  },
  turnLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnSpeaker: {
    ...TYPE.label,
  },
  turnTime: {
    ...TYPE.mono,
    color: colors.textWeak,
  },
  turnText: {
    ...TYPE.bodyLarge,
  },
  visual: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  visualTile: {
    width: 160,
    height: 160,
    borderRadius: 32,
    backgroundColor: colors.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artwork: {
    width: 220,
    height: 220,
    borderRadius: 24,
    backgroundColor: colors.fillWeak,
  },
  visualTitle: {
    ...TYPE.bodyLarge,
    color: colors.textStrong,
    textAlign: 'center',
  },
  statusText: {
    ...TYPE.bodySmall,
    color: colors.textWeak,
  },
  timelineSection: {
    gap: 2,
  },
  timelineHitArea: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.fillWeak,
    overflow: 'hidden',
  },
  block: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  playhead: {
    position: 'absolute',
    left: 0,
    top: (44 - PLAYHEAD_HEIGHT) / 2,
    width: PLAYHEAD_WIDTH,
    height: PLAYHEAD_HEIGHT,
    borderRadius: PLAYHEAD_WIDTH / 2,
    // White in every theme, with a soft shadow so it still reads on light tracks.
    backgroundColor: colors.mediaText,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    ...TYPE.mono,
    color: colors.textWeak,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedButton: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    ...TYPE.buttonSmall,
    color: colors.textStrong,
  },
  skipButton: {
    width: SKIP_BUTTON_SIZE,
    height: SKIP_BUTTON_SIZE,
    borderRadius: SKIP_BUTTON_SIZE / 2,
    backgroundColor: colors.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLabel: {
    ...TYPE.eyebrow,
    position: 'absolute',
    color: colors.textStrong,
    // The rotate icons have their gap at the top; nudge the number into the ring's centre.
    marginTop: 2,
  },
  // Round like the skip buttons, a step larger, and white in every theme.
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: PLAY_BUTTON_SIZE / 2,
    backgroundColor: colors.mediaText,
    borderWidth: 1,
    borderColor: colors.strokeWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 3,
  },
});
