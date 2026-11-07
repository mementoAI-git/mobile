import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useEffect } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import X from 'lucide-react-native/icons/x';
import { Controller, useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import { Button, PasswordInput, TextInput } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';
import { useChangePassword } from '@/hooks/mutations/use-auth-mutations';
import { useProfile } from '@/hooks/queries/use-profile';
import { getSheetBottomPadding } from '@/features/layout/sheet-safe-area';

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
      <View style={sheetStyles.header}>
        <Text style={TYPE.sectionTitle}>Change password</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            onClose?.();
          }}
          style={sheetStyles.close}
        >
          <X size={22} color={COLORS.textStrong} />
        </TouchableOpacity>
      </View>
      <View style={sheetStyles.form}>
        <TextInput
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
            <PasswordInput
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
            <PasswordInput
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
            <PasswordInput
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
          <Text style={sheetStyles.error}>We couldn&apos;t update your password. Check the old password and try again.</Text>
        )}
      </View>
      <View style={[sheetStyles.actions, {paddingBottom: getSheetBottomPadding(insets.bottom, 12)}]}>
        <Button variant="secondary" size="lg" className="h-14 flex-1" onPress={onClose}>
          Dismiss
        </Button>
        <Button size="lg" className="h-14 flex-1" loading={changePassword.isPending} onPress={submit}>
          Save password
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}

const sheetStyles = {
  header: {
    minHeight: 44,
    paddingHorizontal: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.fillWeak,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
  },
  error: { ...TYPE.bodySmall, color: COLORS.error },
};
