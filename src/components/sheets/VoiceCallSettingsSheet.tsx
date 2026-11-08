import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Touchable';
import Check from 'lucide-react-native/icons/check';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { VoiceLanguageSelect } from '@/components/chat/VoiceLanguageSelect';
import { VoiceArtwork } from '@/components/chat/VoiceArtwork';
import { TYPE } from '@/constants/typography';
import { VOICE_CATALOG, getVoiceById, type VoiceId } from '@/features/chat/voice-catalog';
import { useUiStore, useVoicePreferenceStore } from '@/store';
import { useUpdateProfile } from '@/hooks/mutations/use-profile-mutation';
import { saveCallVoice } from '@/features/chat/voice-call-voice';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';

interface VoiceCallSettingsSheetProps {
  selectedVoiceId: VoiceId;
  onSaved?: (voiceId: VoiceId) => void | Promise<void>;
  onClose: () => void;
}

export function VoiceCallSettingsSheet({ selectedVoiceId, onSaved, onClose }: VoiceCallSettingsSheetProps) {
  const COLORS = useThemeColors();
  const [draft, setDraft] = useState(selectedVoiceId);
  const savedLanguage = useVoicePreferenceStore(state => state.languageCode);
  const [language, setLanguage] = useState(savedLanguage);
  const selectLanguage = useVoicePreferenceStore(state => state.selectLanguage);
  const selectVoice = useVoicePreferenceStore((state) => state.selectVoice);
  const { mutateAsync: updateProfileAsync } = useUpdateProfile();
  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
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
      if (draft !== selectedVoiceId) await saveCallVoice(voice, { saveProfile: updateProfileAsync, saveLocal: selectVoice });
      await selectLanguage(language);
    } catch {
      if (isMountedRef.current) setSaveFailed(true);
      return;
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
    if (!isMountedRef.current) return;
    if (draft !== selectedVoiceId) await onSaved?.(draft);
    useUiStore.getState().closeSheet();
  }, [draft, language, selectedVoiceId, selectLanguage, onSaved, selectVoice, updateProfileAsync]);

  return (
    <View style={{ gap: SHEET_GROUP_GAP, paddingBottom: 8 }}>
      <SheetHeader title="Settings" onClose={onClose} closeLabel="Close voice settings" />
      <View style={{ gap: SHEET_SECTION_GAP }}>
      <VoiceLanguageSelect value={language} onChange={setLanguage} disabled={saving} />
      <View>
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
      </View>
      </View>
      <View style={{ gap: 12 }}>
        <View className="flex-row gap-3">
          <Button variant="secondary" size="lg" rounded="full" className="h-14 flex-1" onPress={onClose}>Dismiss</Button>
          <Button size="lg" rounded="full" className="h-14 flex-1" loading={saving} onPress={() => void save()}>Save changes</Button>
        </View>
        {saveFailed ? (
          <Text className="text-center text-error-strong" style={TYPE.bodySmall}>
            We couldn’t save your settings. Check your connection and try again.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
