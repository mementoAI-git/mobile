import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { VoiceArtwork } from '@/components/chat/VoiceArtwork';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { VOICE_CATALOG, getVoiceById, type VoiceId } from '@/features/chat/voice-catalog';
import { useUiStore, useVoicePreferenceStore } from '@/store';
import { useUpdateProfile } from '@/hooks/mutations/use-profile-mutation';
import { saveCallVoice } from '@/features/chat/voice-call-voice';

interface VoiceCallSettingsSheetProps {
  selectedVoiceId: VoiceId;
  onSaved?: (voiceId: VoiceId) => void | Promise<void>;
  onClose: () => void;
}

export function VoiceCallSettingsSheet({ selectedVoiceId, onSaved, onClose }: VoiceCallSettingsSheetProps) {
  const [draft, setDraft] = useState(selectedVoiceId);
  const selectVoice = useVoicePreferenceStore((state) => state.selectVoice);
  const { mutateAsync: updateProfileAsync } = useUpdateProfile();
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // The server locks the call voice from the profile, so wait for it to accept
  // the change before the call screen fetches a new token.
  const save = useCallback(async () => {
    const voice = getVoiceById(draft);
    if (!voice) return;
    setSaveFailed(false);
    setSaving(true);
    try {
      await saveCallVoice(voice, { saveProfile: updateProfileAsync, saveLocal: selectVoice });
    } catch {
      setSaveFailed(true);
      return;
    } finally {
      setSaving(false);
    }
    await onSaved?.(draft);
    useUiStore.getState().closeSheet();
  }, [draft, onSaved, selectVoice, updateProfileAsync]);

  return (
    <View className="pb-2 pt-2">
      <View className="mb-5 flex-row items-center justify-between">
        <Text className="text-text-strong" style={TYPE.sectionTitle}>Settings</Text>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onClose();
          }}
          className="size-11 items-center justify-center rounded-full bg-fill-weaker"
        >
          <X size={20} color={COLORS.textBase} />
        </Pressable>
      </View>
      <Text className="mb-3 text-text-strong" style={TYPE.label}>Change voice</Text>
      <View className="gap-3">
        {VOICE_CATALOG.map((voice) => {
          const selected = voice.id === draft;
          return (
            <Pressable
              key={voice.id}
              onPress={() => { void Haptics.selectionAsync(); setDraft(voice.id); }}
              className="min-h-16 flex-row items-center rounded-2xl border bg-card px-4 py-3"
              style={{ borderColor: selected ? COLORS.brand : COLORS.strokeWeak }}
            >
              <VoiceArtwork voice={voice} size={48} />
              <View className="ml-4 flex-1">
                <Text className="text-text-strong" style={TYPE.button}>{voice.name}</Text>
                <Text className="text-text-base" style={TYPE.bodySmall}>{voice.subtitle}</Text>
              </View>
              {selected ? <View className="size-6 items-center justify-center rounded-full bg-brand"><Check size={15} color={COLORS.textInverse} /></View> : null}
            </Pressable>
          );
        })}
      </View>
      <View className="mt-5 flex-row gap-3">
        <Button variant="secondary" className="h-14 flex-1" onPress={onClose}>Dismiss</Button>
        <Button className="h-14 flex-1" loading={saving} onPress={() => void save()}>Save changes</Button>
      </View>
      {saveFailed ? (
        <Text className="mt-3 text-center text-error-strong" style={TYPE.bodySmall}>
          We couldn’t save your voice. Check your connection and try again.
        </Text>
      ) : null}
    </View>
  );
}
