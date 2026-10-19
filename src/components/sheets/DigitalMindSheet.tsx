import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import X from 'lucide-react-native/icons/x';
import Check from 'lucide-react-native/icons/check';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Pressable } from '@/components/ui/Touchable';
import { DigitalMindAvatar } from '@/components/chat/DigitalMindAvatar';
import { useDigitalMindStore } from '@/store/digital-mind.store';
import { useAuthStore, useUserStore } from '@/store';
import { DEFAULT_DIGITAL_MIND, DIGITAL_MIND_COLOURS, DIGITAL_MIND_NAME_LIMIT, DIGITAL_MIND_SHAPES, normalizeDigitalMind, type DigitalMindColour, type DigitalMindShape } from '@/features/chat/digital-mind';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';

export function DigitalMindSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const colors = useThemeColors();
  const saved = useDigitalMindStore(state => state.profiles[userId]);
  const saveProfile = useDigitalMindStore(state => state.save);
  const [draft, setDraft] = useState(() => normalizeDigitalMind(saved));
  const user = useUserStore(state => state.user);
  const authUser = useAuthStore(state => state.user);
  const account = user ?? authUser;
  const preview = useMemo(() => normalizeDigitalMind(draft), [draft]);
  const changeName = useCallback((name: string) => setDraft(value => ({ ...value, name })), []);
  const chooseStyle = useCallback((style: DigitalMindShape | 'identicon') => {
    void Haptics.selectionAsync(); setDraft(value => ({ ...value, style }));
  }, []);
  const chooseColour = useCallback((colour: DigitalMindColour) => {
    void Haptics.selectionAsync(); setDraft(value => ({ ...value, colour }));
  }, []);
  const save = useCallback(() => {
    if (!userId) return;
    Keyboard.dismiss(); saveProfile(userId, preview); onClose();
  }, [userId, saveProfile, preview, onClose]);
  return <View className="gap-6 pb-2">
    <View className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 text-text-strong" style={TYPE.sheetTitle}>Your digital mind</Text>
      <Button iconOnly variant="secondary" rounded="full" onPress={onClose} accessibilityLabel="Close digital mind customization" style={{ width: 44, height: 44, minHeight: 44, paddingHorizontal: 0 }}><X size={20} color={colors.textBase} /></Button>
    </View>
    <View className="items-center py-2">
      <DigitalMindAvatar profile={preview} size={128} userImage={account?.picture_url || account?.picture} userName={account?.fullname || account?.first_name} userSeed={account?.email || userId} />
    </View>
    <TextInput label="Name" accessibilityLabel="Digital mind name" value={draft.name} onChangeText={changeName} placeholder={DEFAULT_DIGITAL_MIND.name}
      maxLength={DIGITAL_MIND_NAME_LIMIT} returnKeyType="done" variant="rounded" InputComponent={BottomSheetTextInput} />
    <View className="gap-3">
      <Text style={TYPE.label} className="text-text-strong">Avatar style</Text>
      <View className="flex-row gap-3">
        {(['identicon', ...DIGITAL_MIND_SHAPES] as const).map(shape => <Pressable key={shape} onPress={() => chooseStyle(shape)} accessibilityRole="radio" accessibilityLabel={shape === 'identicon' ? 'Original identicon avatar' : `${shape} avatar`} accessibilityState={{ checked: draft.style === shape }}
          className="flex-1 items-center justify-center rounded-[14px] border py-3" style={{ borderColor: draft.style === shape ? colors.brand : colors.strokeWeak, backgroundColor: draft.style === shape ? colors.brandSubtle : colors.fillWeaker }}>
          <DigitalMindAvatar profile={{ ...preview, style: shape }} size={44} badge={false} userImage={account?.picture_url || account?.picture} userSeed={account?.email || userId} userName={account?.fullname || account?.first_name} />
        </Pressable>)}
      </View>
    </View>
    <View className="gap-3">
      <Text style={TYPE.label} className="text-text-strong">Colour</Text>
      <View className="flex-row justify-between">
        {DIGITAL_MIND_COLOURS.map(colour => <Pressable key={colour.id} onPress={() => chooseColour(colour.id)} accessibilityRole="radio" accessibilityLabel={`${colour.label} avatar colour`} accessibilityState={{ checked: draft.colour === colour.id }}
          style={{ minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 2, borderColor: draft.colour === colour.id ? colors.textStrong : 'transparent', padding: 4, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors[colour.token], alignItems: 'center', justifyContent: 'center' }}>
            {draft.colour === colour.id && <Check size={18} color={colors.textInverse} strokeWidth={2.5} />}
          </View>
        </Pressable>)}
      </View>
    </View>
    <Button onPress={save} disabled={!userId} fullWidth variant="ghost" accessibilityLabel="Save" style={{ height: 48, minHeight: 48, borderRadius: 100, paddingVertical: 0, backgroundColor: colors.activeFill }}>
      <Text style={[TYPE.button, { color: colors.activeText }]}>Save</Text>
    </Button>
  </View>;
}
