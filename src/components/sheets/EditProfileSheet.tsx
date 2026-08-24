import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CalendarDays, X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import { Button, TextInput } from '@/components/ui';
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';
import { COLORS, FONTS } from '@/constants/tokens';
import {
  normalizeProfileForm,
  toProfileUpdatePayload,
  type ProfileFormValues,
} from '@/features/account/profile-form';
import { useUpdateProfile } from '@/hooks/mutations/use-profile-mutation';
import { useProfile } from '@/hooks/queries/use-profile';

interface EditProfileSheetProps {
  onClose?: () => void;
  expandSheet: () => void;
}

export function EditProfileSheet({
  onClose,
  expandSheet,
}: EditProfileSheetProps) {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: normalizeProfileForm(profile),
  });

  useEffect(() => {
    reset(normalizeProfileForm(profile));
  }, [profile, reset]);

  const close = useCallback(() => {
    Haptics.selectionAsync();
    onClose?.();
  }, [onClose]);

  const submit = handleSubmit(async (values) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateProfile.mutateAsync(toProfileUpdatePayload(values, profile?.context));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose?.();
  });
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const submitFromFooter = useCallback(() => {
    void submitRef.current();
  }, []);
  const footer = useMemo(
    () => (
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 20,
          borderTopWidth: 1,
          borderTopColor: COLORS.strokeWeaker,
          backgroundColor: COLORS.background,
        }}
      >
        <Button
          variant="secondary"
          size="lg"
          className="h-14 flex-1"
          textClassName="text-base font-bold"
          onPress={onClose}
        >
          Dismiss
        </Button>
        <Button
          size="lg"
          className="h-14 flex-1"
          textClassName="text-base font-bold"
          loading={updateProfile.isPending}
          onPress={submitFromFooter}
        >
          Save changes
        </Button>
      </View>
    ),
    [onClose, submitFromFooter, updateProfile.isPending],
  );

  const field = (
    name: keyof ProfileFormValues,
    label: string,
    options?: {
      disabled?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      rightElement?: React.ReactNode;
      leftElement?: React.ReactNode;
      rules?: Record<string, unknown>;
      multiline?: boolean;
      numberOfLines?: number;
    },
  ) => (
    <Controller
      key={name}
      control={control}
      name={name}
      rules={options?.rules}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput
          label={label}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          editable={!options?.disabled}
          keyboardType={options?.keyboardType}
          autoCapitalize={name === 'email' ? 'none' : 'words'}
          rightElement={options?.rightElement}
          leftElement={options?.leftElement}
          error={errors[name]?.message}
          inputClassName={options?.disabled ? 'text-text-weak' : undefined}
          multiline={options?.multiline}
          numberOfLines={options?.numberOfLines}
          textAlignVertical={options?.multiline ? 'top' : undefined}
        />
      )}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1 }}>
        <View
          style={{
            minHeight: 62,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={SETTINGS_TYPE.sectionTitle}>
            Edit profile
          </Text>
          <TouchableOpacity
            onPress={close}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel="Close edit profile"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.fillWeak,
            }}
          >
            <X size={22} color={COLORS.textStrong} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={expandSheet}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 20,
            gap: 16,
          }}
        >
          {field('email', 'Email address', {
            disabled: true,
            keyboardType: 'email-address',
          })}
          {field('nickname', 'Display name (Nickname)', {
            rules: { required: 'Display name is required' },
          })}
          {field('firstName', 'First Name', {
            rules: { required: 'First name is required' },
          })}
          {field('lastName', 'Last Name', {
            rules: { required: 'Last name is required' },
          })}
          {field('birthday', 'Birthday', {
            rightElement: <CalendarDays size={18} color={COLORS.textBase} />,
            rules: {
              pattern: {
                value: /^\d{2}\/\d{2}\/\d{4}$/,
                message: 'Use DD/MM/YYYY',
              },
            },
          })}
          {field('phone', 'Phone', {
            keyboardType: 'phone-pad',
            leftElement: (
              <Text style={{ color: COLORS.textStrong, fontFamily: FONTS.sansMedium }}>
                🇳🇬
              </Text>
            ),
          })}
          {field('country', 'Country')}
          {field('location', 'City/Location')}
          {field('bio', 'About me', { multiline: true, numberOfLines: 3 })}

          {updateProfile.isError && (
            <Text style={[SETTINGS_TYPE.supporting, { color: COLORS.error }]}>
              We couldn&apos;t save those changes. Please try again.
            </Text>
          )}
        </BottomSheetScrollView>

        {footer}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
