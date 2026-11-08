import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';
import { Button } from '@/components/ui/Button';
import { VoiceIntro } from '@/components/chat/VoiceIntro';
import { VoicePicker } from '@/components/chat/VoicePicker';
import { VoiceUpgradeScreen } from '@/components/chat/VoiceUpgradeScreen';
import { TYPE } from '@/constants/typography';
import { VOICE_CATALOG, getVoiceById, type VoiceId } from '@/features/chat/voice-catalog';
import { useVoiceCall } from '@/hooks/use-voice-call';
import { useUpdateProfile } from '@/hooks/mutations/use-profile-mutation';
import { profileUsesVoice, saveCallVoice } from '@/features/chat/voice-call-voice';
import type { VoiceDefinition } from '@/features/chat/voice-catalog';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore, useUserStore, useVoicePreferenceStore } from '@/store';

type Stage = 'loading' | 'intro' | 'choosing' | 'starting';

/**
 * Opening voice, as on web: first-time users see the intro, then pick a voice.
 * Choosing a voice (or opening voice with one already saved) starts the call
 * and closes this page. The call carries on in the floating call card over
 * the main app (`FloatingVoiceCall`).
 */
export default function VoiceCallRoute() {
  const COLORS = useThemeColors();
  const router = useRouter();
  const { memoryId, voiceIntro } = useLocalSearchParams<{ memoryId?: string; voiceIntro?: string }>();
  const user = useAuthStore((state) => state.user);
  const userStoreUser = useUserStore((state) => state.user);
  const selectedVoiceId = useVoicePreferenceStore((state) => state.selectedVoiceId);
  const hydratedForUser = useVoicePreferenceStore((state) => state.hydratedForUser);
  const isHydrating = useVoicePreferenceStore((state) => state.isHydrating);
  const hydrate = useVoicePreferenceStore((state) => state.hydrate);
  const selectVoice = useVoicePreferenceStore((state) => state.selectVoice);
  const userKey = user?._id ?? user?.email ?? 'anonymous';
  const profile = userStoreUser ?? user;
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
  const [stage, setStage] = useState<Stage>('loading');
  const { voice, startCall } = useVoiceCall();
  const { mutateAsync: updateProfileAsync } = useUpdateProfile();
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSaveFailed, setVoiceSaveFailed] = useState(false);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/overview');
  }, [router]);

  useEffect(() => {
    if (hydratedForUser !== userKey) void hydrate(userKey);
  }, [hydrate, hydratedForUser, userKey]);

  // The server locks the call voice from the profile, so the choice is saved
  // there before the call asks for a token.
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

  const begin = useCallback(async (choice: VoiceDefinition, alreadySaved = false) => {
    setStage('starting');
    // Out of sync (changed on another device or saved only locally): save
    // first. If saving fails the call still starts with the voice the server has.
    if (!alreadySaved && !profileUsesVoice(profile, choice)) await persistVoice(choice);
    startCall({ memoryId: effectiveMemoryId, voiceName: choice.providerVoiceName });
    close();
  }, [close, effectiveMemoryId, persistVoice, profile, startCall]);

  // Decide once, when the saved voice is known: web shows the intro until a
  // voice is saved to the profile, and starts straight away after that.
  const decidedRef = useRef(false);
  useEffect(() => {
    if (decidedRef.current || isHydrating || hydratedForUser !== userKey) return;
    decidedRef.current = true;
    if (voice.connectionFailure?.kind === 'upgrade-required') return;
    if (voice.isConnected || voice.isConnecting) {
      // Already in a call: it is in the floating card.
      close();
      return;
    }
    const savedVoice = getVoiceById(selectedVoiceId ?? '') ?? VOICE_CATALOG.find((choice) => profileUsesVoice(profile, choice));
    if (voiceIntro !== undefined || !savedVoice) {
      if (savedVoice) setDraftVoiceId(savedVoice.id);
      setStage('intro');
      return;
    }
    void begin(savedVoice);
  }, [begin, close, hydratedForUser, isHydrating, profile, selectedVoiceId, userKey, voice.connectionFailure, voice.isConnected, voice.isConnecting, voiceIntro]);

  const chooseVoice = useCallback((id: VoiceId) => {
    if (id === draftVoiceId) return;
    Haptics.selectionAsync();
    setDraftVoiceId(id);
  }, [draftVoiceId]);

  const confirmVoice = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const choice = getVoiceById(draftVoiceId);
    if (!choice || !(await persistVoice(choice))) return;
    await begin(choice, true);
  }, [begin, draftVoiceId, persistVoice]);

  const openPicker = useCallback(() => {
    Haptics.selectionAsync();
    setStage('choosing');
  }, []);

  const dismiss = useCallback(() => {
    Haptics.selectionAsync();
    close();
  }, [close]);

  const selectedVoice = useMemo(() => getVoiceById(draftVoiceId) ?? VOICE_CATALOG[0], [draftVoiceId]);

  if (voice.connectionFailure?.kind === 'upgrade-required') {
    return (
      <NativeModalSafeAreaBoundary>
        <VoiceUpgradeScreen onClose={() => { void voice.disconnect(); close(); }} />
      </NativeModalSafeAreaBoundary>
    );
  }

  if (stage === 'intro') {
    return (
      <NativeModalSafeAreaBoundary>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <VoiceIntro onChooseVoice={openPicker} onDismiss={dismiss} />
        </SafeAreaView>
      </NativeModalSafeAreaBoundary>
    );
  }

  if (stage === 'choosing') {
    return (
      <NativeModalSafeAreaBoundary>
        <SafeAreaView className="flex-1 px-4" edges={['top', 'bottom']}>
          <View className="flex-row justify-end pt-2">
            <Button
              voiceLabel={false}
              iconOnly
              variant="secondary"
              rounded="full"
              accessibilityLabel="Close voice picker"
              onPress={dismiss}
              style={{ width: 44, height: 44, minHeight: 44 }}
            >
              <X size={20} color={COLORS.textStrong} />
            </Button>
          </View>
          <VoicePicker selectedId={draftVoiceId} onSelect={chooseVoice} />
          <Button
            voiceLabel={false}
            fullWidth
            rounded="full"
            className="mb-2"
            style={{ height: 48, minHeight: 48 }}
            loading={savingVoice}
            accessibilityLabel={`Select ${selectedVoice.name} and start the call`}
            onPress={() => void confirmVoice()}
          >
            Select voice
          </Button>
          {voiceSaveFailed ? (
            <Text className="mb-2 text-center text-error-strong" style={TYPE.bodySmall}>
              We couldn’t save your voice. Check your connection and try again.
            </Text>
          ) : null}
        </SafeAreaView>
      </NativeModalSafeAreaBoundary>
    );
  }

  return (
    <NativeModalSafeAreaBoundary>
      <SafeAreaView className="flex-1 items-center justify-center" edges={['top', 'bottom']}>
        <ActivityIndicator color={COLORS.brand} />
      </SafeAreaView>
    </NativeModalSafeAreaBoundary>
  );
}
