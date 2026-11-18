import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { useFileUpload } from '@/hooks/mutations/use-file-upload';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import { START_FAILED_MESSAGE, useStoryRecording } from '@/hooks/use-story-recording';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import type { PermissionLike } from '@/lib/permission-recovery';
import { useUiStore, useUserStore } from '@/store';
import { getRecordingActivityAdapter, useRecordingActivity } from './recording-activity';

export interface RecordingSession {
  phase: 'idle' | 'starting' | 'recording' | 'transcribing';
  isPaused: boolean;
  duration: number;
  levels: number[];
  error: string | null;
  /** A take is starting, recording, paused or saving: closing the sheet only minimizes it. */
  busy: boolean;
  recordingLive: boolean;
  saving: boolean;
  /** A kept recording waiting to be saved (after a failed save). */
  pending: boolean;
  /** The microphone didn't start; nothing was recorded. */
  startFailed: boolean;
  /** True while the recorder sheet is open; otherwise a busy take floats as a card. */
  expanded: boolean;
  /** Bumps when the take ends on its own (saved, or permission refused) so an open sheet closes. */
  closeRequest: number;
  /** Opens the recorder sheet and starts a take unless one is already going or kept. */
  open: () => void;
  /** Done: stops and saves the take, saves a kept one, or tries the microphone again. */
  done: () => void;
  /** Throws the take (or the kept recording) away. */
  discard: () => Promise<void>;
  togglePause: () => void;
}

const RecordingSessionContext = createContext<RecordingSession | null>(null);

export function useRecordingSession(): RecordingSession {
  const session = useContext(RecordingSessionContext);
  if (!session) throw new Error('useRecordingSession must be used inside RecordingSessionProvider');
  return session;
}

/**
 * The Overview recorder, owned by the app rather than its sheet, so a take keeps
 * going when the sheet is swiped down (it floats as a card), the app is left, or
 * the phone is locked (lock-screen card with Pause and Stop). Done uploads the audio
 * and saves it as a private quick capture the AI names from its transcript.
 */
export function RecordingSessionProvider({ children }: { children: React.ReactNode }) {
  const owner = useUserStore((s) => s.user?._id) ?? 'local';
  const expanded = useUiStore((s) => s.activeSheet === 'recorder');
  const { mutateAsync: upload } = useFileUpload();
  const { mutateAsync: quickCapture } = useQuickCapture();
  const [closeRequest, setCloseRequest] = useState(0);
  const requestClose = useCallback(() => setCloseRequest((n) => n + 1), []);

  const saveRecording = useCallback(async (uri: string) => {
    // Stop can be pressed on the lock screen, so ask iOS for time to finish the upload.
    const activity = getRecordingActivityAdapter();
    const backgroundTask = activity?.beginBackgroundTask() ?? null;
    try {
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
    } finally {
      if (backgroundTask !== null) activity?.endBackgroundTask(backgroundTask);
    }
    toast('Recording saved. We’ll name it once it’s transcribed.', 'success');
    requestClose();
  }, [quickCapture, requestClose, upload]);

  const handlePermissionDenied = useCallback((permission: PermissionLike) => {
    showPermissionRecoveryAlert({
      permission,
      title: 'Microphone is off',
      description: 'Allow microphone access to record.',
      settingsDescription: 'Microphone access is turned off in Settings. Turn it back on to record.',
    });
    requestClose();
  }, [requestClose]);

  const recording = useStoryRecording({
    owner: `overview-recorder:${owner}`,
    onRecording: saveRecording,
    onPermissionDenied: handlePermissionDenied,
    background: true,
  });
  const { ready, canRetry, phase, isPaused, duration, levels, error, start, stop, pause, resume, cancel, retry } = recording;

  const saving = phase === 'transcribing';
  const recordingLive = phase === 'recording';
  const busy = phase !== 'idle';
  const pending = phase === 'idle' && canRetry;
  const startFailed = phase === 'idle' && !canRetry && error === START_FAILED_MESSAGE;

  // Opened before the check for a kept recording finished: start once it has.
  const startWhenReady = useRef(false);
  const open = useCallback(() => {
    useUiStore.getState().openSheet('recorder');
    if (!ready) { startWhenReady.current = true; return; }
    // A kept recording is offered instead of starting over.
    if (phase === 'idle' && !canRetry) void start();
  }, [canRetry, phase, ready, start]);
  useEffect(() => {
    if (!ready || !startWhenReady.current) return;
    startWhenReady.current = false;
    if (!canRetry) void start();
  }, [canRetry, ready, start]);

  const done = useCallback(() => {
    if (pending) void retry();
    else if (startFailed) void start();
    else void stop();
  }, [pending, retry, start, startFailed, stop]);

  const discard = useCallback(async () => {
    if (pending) await recording.discard();
    else await cancel();
  }, [cancel, pending, recording]);

  const togglePause = useCallback(() => {
    if (isPaused) resume();
    else pause();
  }, [isPaused, pause, resume]);

  // Lock screen and Dynamic Island: timer, Pause/Resume and Stop (Stop saves, like Done).
  useRecordingActivity({ live: recordingLive, isPaused, elapsedSeconds: duration, onTogglePause: togglePause, onStop: done });

  // A save that fails while the recorder is minimized has no sheet to show it in.
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  useEffect(() => {
    if (error && phase === 'idle' && canRetry && !expandedRef.current) {
      toast('Your recording isn’t saved yet. Tap record to try again.', 'error');
    }
  }, [canRetry, error, phase]);

  const value = useMemo<RecordingSession>(() => ({
    phase, isPaused, duration, levels, error, busy, recordingLive, saving, pending, startFailed, expanded, closeRequest,
    open, done, discard, togglePause,
  }), [busy, closeRequest, discard, done, duration, error, expanded, isPaused, levels, open, pending, phase, recordingLive, saving, startFailed, togglePause]);

  return <RecordingSessionContext.Provider value={value}>{children}</RecordingSessionContext.Provider>;
}
