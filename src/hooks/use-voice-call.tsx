import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePathname } from 'expo-router';

import { useBackgroundMusic } from '@/hooks/use-background-music';
import { useVoiceMode, type VoiceCallActionEffects } from '@/hooks/use-voice-mode';
import { useAuthStore } from '@/store';

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

  const leaveCallScreen = useCallback(() => {
    if (pathnameRef.current === VOICE_CALL_PATH && router.canGoBack()) router.back();
  }, []);

  const callActions = useMemo<VoiceCallActionEffects>(
    () => ({
      navigate: (href) => {
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

  const value = useMemo(() => ({ voice, configure }), [voice, configure]);
  return <VoiceCallContext.Provider value={value}>{children}</VoiceCallContext.Provider>;
}

export function useVoiceCall(): VoiceCallContextValue {
  const context = useContext(VoiceCallContext);
  if (!context) throw new Error('useVoiceCall must be used inside VoiceCallProvider');
  return context;
}