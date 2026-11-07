import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { Platform } from 'react-native';

import { CallActivityController, createCallActivityAdapter } from '@/features/chat/call-activity';
import { isCallLive } from '@/features/chat/call-indicator';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useVoiceMode, type VoiceCallActionEffects } from '@/hooks/use-voice-mode';
import { useAuthStore } from '@/store';
import { toast } from '@/components/ui/Toast';
import { voiceControl } from '@/features/voice-control/registry';
import { isCurrentScreen, voiceScreenName } from '@/features/voice-control/screen-names';

export const VOICE_CALL_PATH = '/voice-call';

export type VoiceCallConfig = {
  memoryId?: string | null;
  voiceName?: string;
};

type VoiceCallContextValue = {
  voice: ReturnType<typeof useVoiceMode>;
  /** Set which conversation and voice the next call uses. Ignored during a call. */
  configure(config: VoiceCallConfig): void;
};

const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);

/**
 * Owns the single voice call for the whole app, so a call survives leaving
 * the call screen. The call screen and the floating call bar are views onto it.
 */
export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<VoiceCallConfig>({});
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const { mode } = useGlobalSearchParams<{ mode?: string }>();
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Voice tools say which screen the host is on after every action.
  useEffect(() => {
    voiceControl.setScreenName(() =>
      voiceScreenName(pathnameRef.current, modeRef.current ? `mode=${modeRef.current}` : ''),
    );
  }, []);

  const leaveCallScreen = useCallback(() => {
    if (pathnameRef.current === VOICE_CALL_PATH && router.canGoBack()) router.back();
  }, []);

  const callActions = useMemo<VoiceCallActionEffects>(
    () => ({
      navigate: (href) => {
        // Already there (an edit made on this screen): stay, so the host
        // sees the change in place instead of the screen reopening.
        if (isCurrentScreen(href, pathnameRef.current)) return;
        leaveCallScreen();
        router.push(href as never);
      },
      onModelEndedCall: leaveCallScreen,
    }),
    [leaveCallScreen],
  );

  const voice = useVoiceMode({
    memoryId: config.memoryId,
    voiceName: config.voiceName,
    callActions,
  });
  // Report handled connection failures through app UI, not development LogBox.
  useEffect(() => {
    if (voice.connectionFailure?.kind === 'connection-error') {
      toast('Your voice connection was interrupted. Please try again.', 'error');
    }
  }, [voice.connectionFailure]);

  const active = voice.isConnected || voice.isConnecting;
  const activeRef = useRef(active);
  activeRef.current = active;

  const configure = useCallback((next: VoiceCallConfig) => {
    if (activeRef.current) return;
    setConfig((current) =>
      current.memoryId === next.memoryId && current.voiceName === next.voiceName ? current : next,
    );
  }, []);

  const { pauseForVoice, resumeAfterVoice } = useBackgroundMusic();
  useEffect(() => {
    if (active) pauseForVoice();
    else resumeAfterVoice();
  }, [active, pauseForVoice, resumeAfterVoice]);

  const token = useAuthStore((state) => state.token);
  const { disconnect } = voice;
  useEffect(() => {
    if (!token && active) void disconnect();
  }, [active, disconnect, token]);

  // iOS Live Activity: the call in the Dynamic Island and on the lock screen.
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const callActivity = useMemo(() => {
    const adapter = createCallActivityAdapter(Platform.OS);
    return { adapter, controller: new CallActivityController(adapter) };
  }, []);
  const callLive = isCallLive(voice);
  useEffect(() => {
    callActivity.controller.sync({
      isConnected: callLive,
      isMuted: voice.isMuted,
      isAiSpeaking: voice.isAiSpeaking,
      recordingTime: voiceRef.current.recordingTime,
    });
  }, [callActivity, callLive, voice.isMuted, voice.isAiSpeaking]);
  useEffect(() => {
    const subscription = callActivity.adapter?.onAction((action) => {
      const current = voiceRef.current;
      // A button on a card with no live call behind it just clears the card.
      if (!isCallLive(current)) {
        callActivity.controller.endNow();
        return;
      }
      if (action === 'end') void current.disconnect();
      else current.setMuted(!current.isMuted);
    });
    return () => subscription?.remove();
  }, [callActivity]);

  const value = useMemo(() => ({ voice, configure }), [voice, configure]);
  return <VoiceCallContext.Provider value={value}>{children}</VoiceCallContext.Provider>;
}

export function useVoiceCall(): VoiceCallContextValue {
  const context = useContext(VoiceCallContext);
  if (!context) throw new Error('useVoiceCall must be used inside VoiceCallProvider');
  return context;
}