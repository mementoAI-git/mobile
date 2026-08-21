import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { VoiceArtwork } from '@/components/chat/VoiceArtwork';
import { COLORS, FONTS } from '@/constants/tokens';
import { VOICE_CATALOG, type VoiceId } from '@/features/chat/voice-catalog';
import { useUiStore, useVoicePreferenceStore } from '@/store';

interface VoiceCallSettingsSheetProps {
  selectedVoiceId: VoiceId;
  onSaved?: (voiceId: VoiceId) => void | Promise<void>;
  onClose: () => void;
}

export function VoiceCallSettingsSheet({ selectedVoiceId, onSaved, onClose }: VoiceCallSettingsSheetProps) {
  const [draft, setDraft] = useState(selectedVoiceId);
  const selectVoice = useVoicePreferenceStore((state) => state.selectVoice);

  const save = useCallback(async () => {
    await selectVoice(draft);
    await onSaved?.(draft);
    useUiStore.getState().closeSheet();
  }, [draft, onSaved, selectVoice]);

  return (
    <View className="pb-2 pt-2">
      <View className="mb-5 flex-row items-center justify-between">
        <Text className="text-2xl text-text-strong" style={{ fontFamily: FONTS.serifMedium }}>Settings</Text>
        <Pressable onPress={onClose} className="size-11 items-center justify-center rounded-full bg-fill-weaker">
          <X size={20} color={COLORS.textBase} />
        </Pressable>
      </View>
      <Text className="mb-3 text-base text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>Change voice</Text>
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
                <Text className="text-base text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>{voice.name}</Text>
                <Text className="text-sm text-text-base" style={{ fontFamily: FONTS.sans }}>{voice.subtitle}</Text>
              </View>
              {selected ? <View className="size-6 items-center justify-center rounded-full bg-brand"><Check size={15} color={COLORS.textInverse} /></View> : null}
            </Pressable>
          );
        })}
      </View>
      <View className="mt-5 flex-row gap-3">
        <Button variant="secondary" className="h-14 flex-1" onPress={onClose}>Dismiss</Button>
        <Button className="h-14 flex-1" onPress={() => void save()}>Save changes</Button>
      </View>
    </View>
  );
}
