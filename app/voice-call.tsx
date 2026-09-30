import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff, PhoneOff, Settings, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';
import { Button } from '@/components/ui/Button';
import { VoiceArtwork } from '@/components/chat/VoiceArtwork';
import { VoiceUpgradeScreen } from '@/components/chat/VoiceUpgradeScreen';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { minTouchTarget, iconSize, ms, radius } from '@/constants/responsive';
import { VOICE_CATALOG, getVoiceById, type VoiceId } from '@/features/chat/voice-catalog';
import { formatVoiceCallDuration, getVoiceCallTransition, type VoiceCallStage } from '@/features/chat/voice-call-flow';
import { useVoiceMode } from '@/hooks/use-voice-mode';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore, useUiStore, useUserStore, useVoicePreferenceStore } from '@/store';

function VoiceDots({ selectedId, onSelect }: { selectedId: VoiceId; onSelect: (id: VoiceId) => void }) {
  return (
    <View className="mt-4 flex-row">
      {VOICE_CATALOG.map((voice) => (
        <Pressable
          key={voice.id}
          accessibilityLabel={`Choose ${voice.name}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: voice.id === selectedId }}
          onPress={() => onSelect(voice.id)}
          className="min-h-11 min-w-11 items-center justify-center"
        >
          <View className="size-2.5 rounded-full" style={{ backgroundColor: voice.id === selectedId ? COLORS.brand : COLORS.strokeWeak }} />
        </Pressable>
      ))}
    </View>
  );
}

export default function VoiceCallRoute() {
  const router = useRouter();
  const { memoryId } = useLocalSearchParams<{ memoryId?: string }>();
  const user = useAuthStore((state) => state.user);
  const userStoreUser = useUserStore((state) => state.user);
  const selectedVoiceId = useVoicePreferenceStore((state) => state.selectedVoiceId);
  const hydratedForUser = useVoicePreferenceStore((state) => state.hydratedForUser);
  const isHydrating = useVoicePreferenceStore((state) => state.isHydrating);
  const hydrate = useVoicePreferenceStore((state) => state.hydrate);
  const selectVoice = useVoicePreferenceStore((state) => state.selectVoice);
  const userKey = user?._id ?? user?.email ?? 'anonymous';
  const cachedProfile = queryClient.getQueryData<any>(queryKeys.profile);
  const primaryConvId =
    user?.primary_conversation_id ??
    userStoreUser?.primary_conversation_id ??
    cachedProfile?.primary_conversation_id;
  const rawMemoryId = Array.isArray(memoryId) ? memoryId[0] : memoryId;
  const effectiveMemoryId =
    rawMemoryId && /^[0-9a-fA-F]{24}$/.test(rawMemoryId)
      ? rawMemoryId
      : primaryConvId;
  const [draftVoiceId, setDraftVoiceId] = useState<VoiceId>('denver');
  const [stage, setStage] = useState<VoiceCallStage>('choosing');
  const initializedRef = useRef(false);
  const selectedVoice = useMemo(
    () => getVoiceById(selectedVoiceId ?? draftVoiceId) ?? VOICE_CATALOG[0],
    [draftVoiceId, selectedVoiceId],
  );
  const voice = useVoiceMode({ memoryId: effectiveMemoryId, voiceName: selectedVoice.providerVoiceName });
  const { pauseForVoice, resumeAfterVoice } = useBackgroundMusic();

  useEffect(() => {
    if (hydratedForUser !== userKey) void hydrate(userKey);
  }, [hydrate, hydratedForUser, userKey]);

  useEffect(() => {
    if (isHydrating || hydratedForUser !== userKey || initializedRef.current) return;
    initializedRef.current = true;
    if (selectedVoiceId) {
      setDraftVoiceId(selectedVoiceId);
      setStage('ready');
    } else {
      setStage('choosing');
    }
  }, [hydratedForUser, isHydrating, selectedVoiceId, userKey]);

  useEffect(() => {
    if (stage === 'connecting' && voice.isConnected) {
      setStage(getVoiceCallTransition(stage, 'connected'));
    }
  }, [stage, voice.isConnected]);

  useEffect(() => {
    if (stage === 'connecting' && voice.connectionFailure) {
      setStage(getVoiceCallTransition(stage, 'connection-failed'));
    }
  }, [stage, voice.connectionFailure]);

  useEffect(() => {
    if (stage === 'live' || stage === 'muted' || stage === 'connecting') {
      pauseForVoice();
      return;
    }
    resumeAfterVoice();
  }, [pauseForVoice, resumeAfterVoice, stage]);

  const close = useCallback(async (options?: { showDebrief?: boolean }) => {
    resumeAfterVoice();
    const duration = voice.recordingTime;
    const userSpeechText = voice.userSpeechText;
    const aiSpeechText = voice.aiSpeechText;
    await voice.disconnect();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');

    if (options?.showDebrief && duration > 5) {
      setTimeout(() => {
        useUiStore.getState().openSheet('voice-debrief', {
          duration,
          memoryId: effectiveMemoryId ?? memoryId,
          userSpeechText,
          aiSpeechText,
        });
      }, 350);
    }
  }, [effectiveMemoryId, memoryId, resumeAfterVoice, router, voice]);

  const chooseVoice = useCallback((id: VoiceId) => {
    Haptics.selectionAsync();
    setDraftVoiceId(id);
  }, []);

  const confirmVoice = useCallback(async () => {
    await selectVoice(draftVoiceId);
    setStage(getVoiceCallTransition(stage, 'choose'));
  }, [draftVoiceId, selectVoice, stage]);

  const startingRef = useRef(false);
  const startCall = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStage(getVoiceCallTransition(stage, 'start'));
    try {
      await voice.connect();
    } finally {
      startingRef.current = false;
    }
  }, [stage, voice]);

  const toggleMute = useCallback(() => {
    voice.toggleMute();
    setStage((current) => getVoiceCallTransition(current, 'toggle-mute'));
  }, [voice]);

  const openSettings = useCallback(() => {
    Haptics.selectionAsync();
    useUiStore.getState().openSheet('voice-call-settings', {
      userKey,
      selectedVoiceId: selectedVoice.id,
      onSaved: async (id: VoiceId) => {
        await voice.disconnect();
        setDraftVoiceId(id);
        setStage('ready');
      },
    });
  }, [selectedVoice.id, userKey, voice]);

  const requestEnd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (stage === 'live' || stage === 'muted') {
      useUiStore.getState().openSheet('end-voice-session', {
        duration: voice.recordingTime,
        onEnd: () => close({ showDebrief: true }),
      });
    } else {
      void close();
    }
  }, [close, stage, voice.recordingTime]);

  if (hydratedForUser !== userKey || isHydrating) {
    return (
      <NativeModalSafeAreaBoundary>
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator color={COLORS.brand} />
        </SafeAreaView>
      </NativeModalSafeAreaBoundary>
    );
  }

  if (voice.connectionFailure?.kind === 'upgrade-required') {
    return (
      <NativeModalSafeAreaBoundary>
        <VoiceUpgradeScreen onClose={() => void close()} />
      </NativeModalSafeAreaBoundary>
    );
  }

  if (stage === 'choosing') {
    return (
      <NativeModalSafeAreaBoundary>
        <View className="flex-1 bg-background">
          <LinearGradient
            colors={[COLORS.onboardingCream, COLORS.background]}
            locations={[0, 0.56]}
            className="absolute inset-0"
          />
          <SafeAreaView className="flex-1 px-8" edges={['top', 'bottom']}>
            <View className="flex-1 items-center justify-center pb-24">
              <VoiceArtwork voice={getVoiceById(draftVoiceId) ?? VOICE_CATALOG[0]} size={230} />
              <Text className="mt-7 text-text-strong" style={TYPE.screenTitle}>
                {(getVoiceById(draftVoiceId) ?? VOICE_CATALOG[0]).name}
              </Text>
              <Text className="mt-1 text-text-base" style={TYPE.body}>
                {(getVoiceById(draftVoiceId) ?? VOICE_CATALOG[0]).subtitle}
              </Text>
              <VoiceDots selectedId={draftVoiceId} onSelect={chooseVoice} />
            </View>
            <Button fullWidth className="mb-2 h-14" onPress={() => void confirmVoice()}>
              Open voice call
            </Button>
          </SafeAreaView>
        </View>
      </NativeModalSafeAreaBoundary>
    );
  }

  const live = stage === 'live' || stage === 'muted';
  return (
    <NativeModalSafeAreaBoundary>
      <SafeAreaView className="flex-1 bg-background px-4" edges={['top', 'bottom']}>
        <View className="mt-5 flex-row items-center justify-between">
          <Button variant="outline" className="h-11" leftIcon={<PhoneOff size={20} color={COLORS.textBase} />} onPress={requestEnd}>
            End call
          </Button>
          <Pressable onPress={openSettings} className="size-11 items-center justify-center rounded-full border border-stroke-weak bg-fill-weaker">
            <Settings size={22} color={COLORS.textBase} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center pb-28">
          <Pressable
            disabled={!voice.isAiSpeaking}
            onPress={voice.isAiSpeaking ? voice.interrupt : undefined}
            accessibilityLabel={voice.isAiSpeaking ? 'Tap to interrupt' : undefined}
          >
            <VoiceArtwork voice={selectedVoice} size={132} />
          </Pressable>
          <Text className="mt-5 text-text-strong" style={TYPE.stat}>
            {formatVoiceCallDuration(voice.recordingTime)}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            {live ? (
              <View
                className="size-2 rounded-full"
                style={{
                  backgroundColor:
                    stage === 'muted'
                      ? COLORS.error
                      : voice.isAiSpeaking
                        ? COLORS.brand
                        : COLORS.success,
                }}
              />
            ) : null}
            <Text className="text-text-base" style={TYPE.label}>
              {voice.isConnecting
                ? 'Connecting…'
                : live
                  ? voice.isAiSpeaking
                    ? 'Memento is speaking…'
                    : stage === 'muted'
                      ? 'Microphone muted'
                      : 'Listening…'
                  : 'Ready when you are'}
            </Text>
          </View>
          {live ? (
            <>
              {voice.isAiSpeaking ? (
                <Button
                  variant="outline"
                  className="mt-12 h-14 w-44"
                  onPress={voice.interrupt}
                  leftIcon={<Square size={18} color={COLORS.textStrong} fill={COLORS.textStrong} strokeWidth={0} />}
                >
                  Interrupt
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="mt-12 h-14 w-44"
                  onPress={toggleMute}
                  leftIcon={stage === 'muted' ? <MicOff size={22} color={COLORS.error} /> : <Mic size={22} color={COLORS.textStrong} />}
                >
                  {stage === 'muted' ? 'Unmute' : 'Mute'}
                </Button>
              )}
              <Text className="mt-3 text-text-base" style={TYPE.label}>
                {voice.isAiSpeaking
                  ? 'Tap to speak'
                  : stage === 'muted'
                    ? 'You’re muted'
                    : 'Tap to mute'}
              </Text>
            </>
          ) : (
            <Button className="mt-12 h-14 w-44" loading={voice.isConnecting} onPress={() => void startCall()}>
              Start call
            </Button>
          )}
        </View>
      </SafeAreaView>
    </NativeModalSafeAreaBoundary>
  );
}
