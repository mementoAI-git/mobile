import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff, PhoneOff, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';
import { Button } from '@/components/ui/Button';
import { VoiceArtwork } from '@/components/chat/VoiceArtwork';
import { VoiceUpgradeScreen } from '@/components/chat/VoiceUpgradeScreen';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { VOICE_CATALOG, getVoiceById, type VoiceId } from '@/features/chat/voice-catalog';
import { formatVoiceCallDuration, getVoiceCallTransition, type VoiceCallStage } from '@/features/chat/voice-call-flow';
import { useVoiceMode } from '@/hooks/use-voice-mode';
import { useAuthStore, useUiStore, useVoicePreferenceStore } from '@/store';

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
          className="min-h-11 min-w-8 items-center justify-center"
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
  const selectedVoiceId = useVoicePreferenceStore((state) => state.selectedVoiceId);
  const hydratedForUser = useVoicePreferenceStore((state) => state.hydratedForUser);
  const isHydrating = useVoicePreferenceStore((state) => state.isHydrating);
  const hydrate = useVoicePreferenceStore((state) => state.hydrate);
  const selectVoice = useVoicePreferenceStore((state) => state.selectVoice);
  const userKey = user?._id ?? user?.email ?? 'anonymous';
  const [draftVoiceId, setDraftVoiceId] = useState<VoiceId>('denver');
  const [stage, setStage] = useState<VoiceCallStage>('choosing');
  const initializedRef = useRef(false);
  const selectedVoice = useMemo(
    () => getVoiceById(selectedVoiceId ?? draftVoiceId) ?? VOICE_CATALOG[0],
    [draftVoiceId, selectedVoiceId],
  );
  const voice = useVoiceMode({ memoryId, voiceName: selectedVoice.providerVoiceName });

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
    if (stage === 'connecting' && voice.isConnected) setStage('live');
  }, [stage, voice.isConnected]);

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
    await selectVoice(draftVoiceId);
    setStage(getVoiceCallTransition(stage, 'choose'));
  }, [draftVoiceId, selectVoice, stage]);

  const startCall = useCallback(async () => {
    setStage(getVoiceCallTransition(stage, 'start'));
    await voice.connect();
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
      useUiStore.getState().openSheet('end-voice-session', { duration: voice.recordingTime, onEnd: close });
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
              <Text className="mt-1 text-text-base" style={TYPE.bodyLarge}>
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
          <VoiceArtwork voice={selectedVoice} size={132} />
          <Text className="mt-5 text-text-strong" style={TYPE.stat}>
            {formatVoiceCallDuration(voice.recordingTime)}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            {live ? <View className="size-2 rounded-full" style={{ backgroundColor: stage === 'muted' ? COLORS.error : COLORS.success }} /> : null}
            <Text className="text-text-base" style={TYPE.label}>
              {voice.isConnecting ? 'Connecting…' : live ? 'Live session' : 'Ready when you are'}
            </Text>
          </View>
          {live ? (
            <>
              <Button
                variant="outline"
                className="mt-12 h-14 w-44"
                onPress={toggleMute}
                leftIcon={stage === 'muted' ? <MicOff size={26} color={COLORS.error} /> : <Mic size={26} color={COLORS.textBase} />}
              >
                {stage === 'muted' ? 'Unmute' : 'Mute'}
              </Button>
              <Text className="mt-3 text-text-base" style={TYPE.label}>
                {stage === 'muted' ? 'You’re muted' : 'Tap to mute'}
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
