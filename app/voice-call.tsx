import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Mic from 'lucide-react-native/icons/mic';
import MicOff from 'lucide-react-native/icons/mic-off';
import PhoneOff from 'lucide-react-native/icons/phone-off';
import Settings from 'lucide-react-native/icons/settings';
import Square from 'lucide-react-native/icons/square';
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
import { useVoiceCall } from '@/hooks/use-voice-call';
import { useUpdateProfile } from '@/hooks/mutations/use-profile-mutation';
import { profileUsesVoice, saveCallVoice } from '@/features/chat/voice-call-voice';
import type { VoiceDefinition } from '@/features/chat/voice-catalog';
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
  const { voice, configure } = useVoiceCall();
  const { mutateAsync: updateProfileAsync } = useUpdateProfile();
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSaveFailed, setVoiceSaveFailed] = useState(false);
  // The server locks the call voice from the profile, so the choice must be
  // saved there before a token is built for it.
  const voiceInSync = profileUsesVoice(userStoreUser ?? user, selectedVoice);
  const persistVoice = useCallback(
    async (choice: VoiceDefinition) => {
      setVoiceSaveFailed(false);
      setSavingVoice(true);
      try {
        await saveCallVoice(choice, { saveProfile: updateProfileAsync, saveLocal: selectVoice });
        return true;
      } catch {
        setVoiceSaveFailed(true);
        return false;
      } finally {
        setSavingVoice(false);
      }
    },
    [selectVoice, updateProfileAsync],
  );

  useEffect(() => {
    configure({ memoryId: effectiveMemoryId, voiceName: selectedVoice.providerVoiceName });
  }, [configure, effectiveMemoryId, selectedVoice.providerVoiceName]);

  // Fetch the session token while the user looks at the Start button, so the
  // tap only has to open the connection.
  const { prefetch } = voice;
  useEffect(() => {
    if (stage !== 'ready' || !voiceInSync) return;
    prefetch({ memoryId: effectiveMemoryId, voiceName: selectedVoice.providerVoiceName });
  }, [effectiveMemoryId, prefetch, selectedVoice.providerVoiceName, stage, voiceInSync]);

  // A voice picked before choices were saved to the profile, or changed
  // elsewhere: save it once so the call uses the voice shown here.
  useEffect(() => {
    if (stage !== 'ready' || voiceInSync || savingVoice || voiceSaveFailed) return;
    void persistVoice(selectedVoice);
  }, [persistVoice, savingVoice, selectedVoice, stage, voiceInSync, voiceSaveFailed]);

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

  // The call lives in VoiceCallProvider. When this screen opens during a call,
  // or the model mutes the microphone, follow the call's real state.
  useEffect(() => {
    if (!voice.isConnected) return;
    setStage((current) => {
      if (current === 'ending') return current;
      return voice.isMuted ? 'muted' : 'live';
    });
  }, [voice.isConnected, voice.isMuted]);

  const close = useCallback(async () => {
    await voice.disconnect();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');
  }, [router, voice]);

  const chooseVoice = useCallback((id: VoiceId) => {
    Haptics.selectionAsync();
    setDraftVoiceId(id);
  }, []);

  const confirmVoice = useCallback(async () => {
    const choice = getVoiceById(draftVoiceId);
    if (!choice || !(await persistVoice(choice))) return;
    setStage(getVoiceCallTransition(stage, 'choose'));
  }, [draftVoiceId, persistVoice, stage]);

  const startingRef = useRef(false);
  const startCall = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStage(getVoiceCallTransition(stage, 'start'));
    try {
      // Still out of sync (save failed or in flight): try once more. If it
      // fails again, call anyway with the voice the server has.
      if (!voiceInSync) await persistVoice(selectedVoice);
      await voice.connect();
    } finally {
      startingRef.current = false;
    }
  }, [persistVoice, selectedVoice, stage, voice, voiceInSync]);

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
        onEnd: () => close(),
      });
    } else {
      void close();
    }
  }, [close, stage, voice.recordingTime]);

  // Leaving the screen keeps the call going in the floating call bar.
  const minimize = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');
  }, [router]);

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
            <Button voiceLabel={false} fullWidth className="mb-2 h-14" loading={savingVoice} onPress={() => void confirmVoice()}>
              Open voice call
            </Button>
            {voiceSaveFailed ? (
              <Text className="mb-2 text-center text-error-strong" style={TYPE.bodySmall}>
                We couldn’t save your voice. Check your connection and try again.
              </Text>
            ) : null}
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
          <Button voiceLabel={false} variant="outline" className="h-11" leftIcon={<PhoneOff size={20} color={COLORS.textBase} />} onPress={requestEnd}>
            End call
          </Button>
          <View className="flex-row items-center gap-2">
            {live ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Minimize call"
                onPress={minimize}
                className="size-11 items-center justify-center rounded-full border border-stroke-weak bg-fill-weaker"
              >
                <ChevronDown size={22} color={COLORS.textBase} />
              </Pressable>
            ) : null}
            <Pressable onPress={openSettings} className="size-11 items-center justify-center rounded-full border border-stroke-weak bg-fill-weaker">
              <Settings size={22} color={COLORS.textBase} />
            </Pressable>
          </View>
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
                : voice.isReconnecting
                  ? 'Reconnecting…'
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
                <Button voiceLabel={false}
                  variant="outline"
                  className="mt-12 h-14 w-44"
                  onPress={voice.interrupt}
                  leftIcon={<Square size={18} color={COLORS.textStrong} fill={COLORS.textStrong} strokeWidth={0} />}
                >
                  Interrupt
                </Button>
              ) : (
                <Button voiceLabel={false}
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
            <>
              <Button voiceLabel={false} className="mt-12 h-14 w-44" loading={voice.isConnecting} onPress={() => void startCall()}>
                Start call
              </Button>
              {/* A failed connect returns to this screen; say so. Details go to Sentry. */}
              {voice.connectionFailure?.kind === 'connection-error' && !voice.isConnecting ? (
                <Text className="mt-4 px-6 text-center text-error-strong" style={TYPE.bodySmall}>
                  We couldn’t start your call. Check your connection and try again.
                </Text>
              ) : null}
            </>
          )}
        </View>
      </SafeAreaView>
    </NativeModalSafeAreaBoundary>
  );
}
