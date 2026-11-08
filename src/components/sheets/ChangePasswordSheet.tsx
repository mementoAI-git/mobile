import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useEffect } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import { Button, PasswordInput, TextInput } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { useChangePassword } from '@/hooks/mutations/use-auth-mutations';
import { useProfile } from '@/hooks/queries/use-profile';
import { getSheetBottomPadding, SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { SheetHeader } from './SheetHeader';

interface PasswordValues {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const BottomSheetScrollViewComponent = BottomSheetScrollView as any;

interface ChangePasswordSheetProps {
  onClose?: () => void;
  expandSheet: () => void;
  collapseSheet: () => void;
}

export function ChangePasswordSheet({
  onClose,
  expandSheet,
  collapseSheet,
}: ChangePasswordSheetProps) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const changePassword = useChangePassword();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordValues>({
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', collapseSheet);
    return () => subscription.remove();
  }, [collapseSheet]);

  const submit = handleSubmit(async (values) => {
    if (values.newPassword !== values.confirmPassword) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await changePassword.mutateAsync({
      current_password: values.oldPassword,
      new_password: values.newPassword,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose?.();
  });

  return (
    <KeyboardAwareScrollView
      ScrollViewComponent={BottomSheetScrollViewComponent}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <SheetHeader title="Change password" onClose={() => onClose?.()} style={{ paddingHorizontal: 20 }} />
      <View style={sheetStyles.form}>
        <TextInput bordered
          label="Email address"
          value={profile?.email ?? ''}
          editable={false}
          inputClassName="text-text-weak"
          InputComponent={BottomSheetTextInput}
        />
        <Controller
          control={control}
          name="oldPassword"
          rules={{ required: 'Old password is required' }}
          render={({ field: { value, onChange, onBlur } }) => (
            <PasswordInput bordered
              label="Current password"
              InputComponent={BottomSheetTextInput}
              onFocus={expandSheet}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.oldPassword?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="newPassword"
          rules={{ required: 'New password is required', minLength: { value: 8, message: 'At least 8 characters' } }}
          render={({ field: { value, onChange, onBlur } }) => (
            <PasswordInput bordered
              label="New password"
              InputComponent={BottomSheetTextInput}
              onFocus={expandSheet}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.newPassword?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: 'Confirm your new password',
            validate: (value) => value === watch('newPassword') || 'Passwords do not match',
          }}
          render={({ field: { value, onChange, onBlur } }) => (
            <PasswordInput bordered
              label="Confirm new password"
              InputComponent={BottomSheetTextInput}
              onFocus={expandSheet}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
            />
          )}
        />
        {changePassword.isError && (
          <Text style={[sheetStyles.error, { color: COLORS.error }]}>We couldn&apos;t update your password. Check the old password and try again.</Text>
        )}
      </View>
      <View style={[sheetStyles.actions, { backgroundColor: COLORS.sheet, paddingBottom: getSheetBottomPadding(insets.bottom, 12) }]}>
        <Button variant="secondary" size="lg" rounded="full" className="h-14 flex-1" onPress={onClose}>
          Dismiss
        </Button>
        <Button size="lg" rounded="full" className="h-14 flex-1" loading={changePassword.isPending} onPress={submit}>
          Save password
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}

const sheetStyles = {
  form: {
    paddingHorizontal: 20,
    paddingTop: SHEET_GROUP_GAP,
    gap: SHEET_SECTION_GAP,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: SHEET_GROUP_GAP,
  },
  error: { ...TYPE.bodySmall },
};
