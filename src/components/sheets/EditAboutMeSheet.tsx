import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Button, TextInput } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { normalizeAboutMe, toAboutMeUpdatePayload } from '@/features/account/profile-form';
import { useUpdateProfile } from '@/hooks/mutations/use-profile-mutation';
import { usePersona } from '@/hooks/queries/use-persona';
import { useProfile } from '@/hooks/queries/use-profile';
import { SheetActions, SHEET_FILL } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP } from '@/features/layout/sheet-safe-area';

const ABOUT_ME_MAX_LENGTH = 600;

interface EditAboutMeSheetProps {
  onClose?: () => void;
}

export function EditAboutMeSheet({ onClose }: EditAboutMeSheetProps) {
  const { data: profile } = useProfile();
  const { data: persona } = usePersona();
  const updateProfile = useUpdateProfile();
  const savedBiography = normalizeAboutMe(profile, persona?.self_description);
  const [biography, setBiography] = useState(savedBiography);

  useEffect(() => {
    setBiography(savedBiography);
  }, [savedBiography]);

  const close = useCallback(() => {
    Haptics.selectionAsync();
    onClose?.();
  }, [onClose]);

  const save = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateProfile.mutateAsync(toAboutMeUpdatePayload(biography, profile?.context));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose?.();
    } catch {
      toast('We couldn’t save your About me. Please try again.', 'error');
    }
  }, [biography, onClose, profile?.context, updateProfile]);

  const unchanged = biography.trim() === savedBiography.trim();

  return (
    <View style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
      <SheetHeader title="About me" onClose={onClose} closeLabel="Close About me" />

      <TextInput
        InputComponent={BottomSheetTextInput}
        label="In your own words"
        hint={`${biography.length}/${ABOUT_ME_MAX_LENGTH}`}
        value={biography}
        onChangeText={setBiography}
        placeholder="Write a little about yourself."
        maxLength={ABOUT_ME_MAX_LENGTH}
        multiline
        textAlignVertical="top"
        inputClassName="min-h-[140px]"
      />

      <SheetActions style={{ flexDirection: 'row', gap: 12 }}>
        <Button variant="secondary" size="lg" rounded="full" className="h-14 flex-1" onPress={close}>
          Dismiss
        </Button>
        <Button
          size="lg"
          rounded="full"
          className="h-14 flex-1"
          loading={updateProfile.isPending}
          disabled={unchanged}
          onPress={save}
        >
          Save
        </Button>
      </SheetActions>
    </View>
  );
}
