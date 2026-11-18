import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import X from 'lucide-react-native/icons/x';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { TYPE } from '@/constants/typography';
import type { ThemeColors } from '@/constants/tokens';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { SHEET_GROUP_GAP } from '@/features/layout/sheet-safe-area';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import { useStoryRecording } from '@/hooks/use-story-recording';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import type { PermissionLike } from '@/lib/permission-recovery';
import { useUserStore } from '@/store';

const ROUND_BUTTON = { width: 56, height: 56, minHeight: 56 };
const BAR_WIDTH = 4;
const WAVE_HEIGHT = 56;

/**
 * The Overview record button's recorder. Recording starts when the sheet opens;
 * Done uploads the audio and saves it as a private quick capture that the AI
 * names from the transcript (`auto_title`). A failed save keeps the recording
 * on the device, so the sheet offers it again, including after a swipe-down.
 */
export function RecorderSheet({ onClose }: { onClose: () => void }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const owner = useUserStore((s) => s.user?._id) ?? 'local';
  const { mutateAsync: upload } = useFileUpload();
  const { mutateAsync: quickCapture } = useQuickCapture();
  const mountedRef = useRef(true);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => () => { mountedRef.current = false; }, []);

  const saveRecording = useCallback(async (uri: string) => {
    let fileId: string | undefined;
    try {
      fileId = (await upload({ uri, type: 'audio/m4a', name: `voice_${Date.now()}.m4a` }))?._id;
    } catch { /* Reported below. */ }
    if (!fileId) throw new Error('Couldn’t upload your recording. It’s kept on this phone, so you can try again.');
    try {
      await quickCapture({ body: '', attachments: [fileId], visibility: 'private', auto_title: true });
    } catch {
      throw new Error('Couldn’t save your recording. It’s kept on this phone, so you can try again.');
    }
    toast('Recording saved. We’ll name it once it’s transcribed.', 'success');
    if (mountedRef.current) closeRef.current();
  }, [quickCapture, upload]);

  const handlePermissionDenied = useCallback((permission: PermissionLike) => {
    showPermissionRecoveryAlert({
      permission,
      title: 'Microphone is off',
      description: 'Allow microphone access to record.',
      settingsDescription: 'Microphone access is turned off in Settings. Turn it back on to record.',
    });
    closeRef.current();
  }, []);

  const recording = useStoryRecording({
    owner: `overview-recorder:${owner}`,
    onRecording: saveRecording,
    onPermissionDenied: handlePermissionDenied,
  });
  const { ready, canRetry, phase, isPaused, duration, levels, error, start, stop, pause, resume, cancel, retry, discard } = recording;

  // Start once the hook has checked for a recording kept from an earlier session.
  const startedRef = useRef(false);
  useEffect(() => {
    if (!ready || startedRef.current || canRetry) return;
    startedRef.current = true;
    void start();
  }, [canRetry, ready, start]);

  const saving = phase === 'transcribing';
  const recordingLive = phase === 'recording';
  // A kept recording waiting to be saved (after a failure or a swipe-down mid-take).
  const pending = phase === 'idle' && canRetry;

  const handleDone = useCallback(() => {
    if (pending) void retry();
    else void stop();
  }, [pending, retry, stop]);

  const handleCancel = useCallback(async () => {
    if (pending) await discard();
    else await cancel();
    closeRef.current();
  }, [cancel, discard, pending]);

  const togglePause = useCallback(() => {
    if (isPaused) resume();
    else pause();
  }, [isPaused, pause, resume]);

  const status = pending ? 'Not saved yet' : isPaused ? 'Paused' : formatVoiceCallDuration(duration);
  const live = recordingLive && !isPaused;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
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

      <View style={styles.actions}>
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
          className="flex-1"
          onPress={handleDone}
          loading={saving}
          disabled={!pending && !recordingLive}
          leftIcon={<Check size={22} color={colors.textInverse} strokeWidth={2.4} />}
          accessibilityLabel={pending ? 'Save recording' : 'Done, save recording'}
        >
          {pending ? 'Save' : 'Done'}
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
            : <Pause size={20} color={colors.textStrong} fill={colors.textStrong} />}
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
    gap: 12,
  },
});
