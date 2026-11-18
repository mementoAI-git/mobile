import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import X from 'lucide-react-native/icons/x';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import { Button } from '@/components/ui/Button';
import { TYPE } from '@/constants/typography';
import type { ThemeColors } from '@/constants/tokens';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { SHEET_GROUP_GAP } from '@/features/layout/sheet-safe-area';
import { useRecordingSession } from '@/features/overview/recording-session';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';

const ROUND_BUTTON = { width: 56, height: 56, minHeight: 56 };
const MINIMIZE_BUTTON = { width: 44, height: 44, minHeight: 44 };
const BAR_WIDTH = 4;
const WAVE_HEIGHT = 56;
const ACTION_GAP = 12;
/** Done is 70% of the room left beside the two round buttons; the row stays centred with 12px gaps. */
const DONE_WIDTH_RATIO = 0.7;

/**
 * The Overview recorder, expanded. The take itself belongs to RecordingSessionProvider,
 * so swiping this sheet down (or the chevron) only minimizes it: it keeps recording and
 * floats as a card over every screen (FloatingRecorder) until Done or X.
 */
export function RecorderSheet({ onClose }: { onClose: () => void }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const session = useRecordingSession();
  const { isPaused, duration, levels, error, busy, recordingLive, saving, pending, startFailed, closeRequest, done, discard, togglePause } = session;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // The take ended on its own (saved, or the microphone was refused): close.
  const firstCloseRequest = useRef(closeRequest);
  useEffect(() => {
    if (closeRequest !== firstCloseRequest.current) closeRef.current();
  }, [closeRequest]);

  const handleCancel = useCallback(async () => {
    await discard();
    closeRef.current();
  }, [discard]);

  const [doneWidth, setDoneWidth] = useState(0);
  const handleActionsLayout = useCallback((event: LayoutChangeEvent) => {
    const room = event.nativeEvent.layout.width - ROUND_BUTTON.width * 2 - ACTION_GAP * 2;
    setDoneWidth(Math.round(room * DONE_WIDTH_RATIO));
  }, []);

  const status = pending ? 'Not saved yet' : startFailed ? 'Not recording' : isPaused ? 'Paused' : formatVoiceCallDuration(duration);
  const live = recordingLive && !isPaused;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {busy ? (
          <Button
            variant="ghost"
            rounded="full"
            iconOnly
            onPress={() => closeRef.current()}
            accessibilityLabel="Minimize recorder, keep recording"
            style={[MINIMIZE_BUTTON, styles.minimize]}
          >
            <ChevronDown size={22} color={colors.textBase} />
          </Button>
        ) : null}
        <Text style={styles.title} accessibilityRole="header">New recording</Text>
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          <View style={[styles.dot, { backgroundColor: live ? colors.success : colors.textMuted }]} />
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>

      <View style={styles.wave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {levels.map((level, index) => (
          <View
            // Levels shift left as new samples arrive; position is the identity.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            style={[styles.bar, { height: Math.max(BAR_WIDTH, Math.round(level * WAVE_HEIGHT)) }]}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions} onLayout={handleActionsLayout}>
        <Button
          variant="outline"
          rounded="full"
          iconOnly
          onPress={() => { void handleCancel(); }}
          disabled={saving}
          accessibilityLabel={pending ? 'Discard recording' : 'Cancel recording'}
          style={ROUND_BUTTON}
        >
          <X size={22} color={colors.textStrong} />
        </Button>
        <Button
          size="lg"
          rounded="full"
          style={doneWidth ? { width: doneWidth } : styles.doneFallback}
          onPress={done}
          loading={saving}
          disabled={!pending && !recordingLive && !startFailed}
          leftIcon={startFailed ? undefined : <Check size={22} color={colors.textInverse} strokeWidth={2.4} />}
          accessibilityLabel={pending ? 'Save recording' : startFailed ? 'Try recording again' : 'Done, save recording'}
        >
          {pending ? 'Save' : startFailed ? 'Try again' : 'Done'}
        </Button>
        <Button
          variant="outline"
          rounded="full"
          iconOnly
          onPress={togglePause}
          disabled={!recordingLive}
          accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'}
          style={ROUND_BUTTON}
        >
          {isPaused
            ? <Play size={20} color={colors.textStrong} fill={colors.textStrong} />
            : <Pause size={20} color={colors.textStrong} fill={colors.textStrong} strokeWidth={0} />}
        </Button>
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    gap: SHEET_GROUP_GAP,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  minimize: {
    position: 'absolute',
    left: 0,
    top: -6,
  },
  title: {
    ...TYPE.sheetTitle,
    color: c.textStrong,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  status: {
    ...TYPE.body,
    color: c.textBase,
    fontVariant: ['tabular-nums'],
  },
  wave: {
    height: WAVE_HEIGHT + 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    backgroundColor: c.textMuted,
  },
  error: {
    ...TYPE.bodySmall,
    color: c.textWeak,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ACTION_GAP,
  },
  doneFallback: {
    flex: 1,
  },
});
