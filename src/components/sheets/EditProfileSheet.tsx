import { useThemeColors } from '@/hooks/use-theme-colors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { requestLibraryPickerAccess } from '@/features/media/library-picker-access';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Camera from 'lucide-react-native/icons/camera';
import { Controller, useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import { Avatar, Button, TextInput } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { TYPE } from '@/constants/typography';
import {
  normalizeProfileForm,
  toProfileUpdatePayload,
  type ProfileFormValues,
} from '@/features/account/profile-form';
import { useUpdateProfile, useUploadProfilePicture } from '@/hooks/mutations/use-profile-mutation';
import { useProfile } from '@/hooks/queries/use-profile';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { SheetHeader } from './SheetHeader';

interface EditProfileSheetProps {
  onClose?: () => void;
  expandSheet: () => void;
}

export function EditProfileSheet({
  onClose,
  expandSheet,
}: EditProfileSheetProps) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadProfilePicture = useUploadProfilePicture();
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const displayName = profile?.fullname?.trim()
    || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
    || profile?.nickname
    || 'Your account';
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

  const handlePickAvatar = useCallback(async () => {
    Haptics.selectionAsync();
    const permission = await requestLibraryPickerAccess();
    if (permission.status !== 'granted') {
      showPermissionRecoveryAlert({
        permission,
        title: 'Your photos are tucked away',
        description: 'Allow photo access to choose a profile picture.',
        settingsDescription: 'Photo access is turned off in Settings. Turn it back on to choose a profile picture.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    setLocalAvatarUri(asset.uri);

    try {
      await uploadProfilePicture.mutateAsync({
        uri: asset.uri,
        name: asset.fileName ?? `avatar_${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast('Profile photo updated.', 'success');
    } catch (error: any) {
      toast(error?.message || 'Could not upload profile photo. Try again.', 'error');
    }
  }, [uploadProfilePicture]);

  const close = useCallback(() => {
    Haptics.selectionAsync();
    onClose?.();
  }, [onClose]);

  const submit = handleSubmit(async (values) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateProfile.mutateAsync(toProfileUpdatePayload(values));
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
          paddingBottom: getSheetActionsBottomPadding(insets.bottom),
          backgroundColor: COLORS.sheet,
        }}
      >
        <Button
          variant="secondary"
          size="lg"
          rounded="full"
          className="h-14 flex-1"
          onPress={onClose}
        >
          Dismiss
        </Button>
        <Button
          size="lg"
          rounded="full"
          className="h-14 flex-1"
          loading={updateProfile.isPending}
          onPress={submitFromFooter}
        >
          Save changes
        </Button>
      </View>
    ),
    [COLORS.sheet, insets.bottom, onClose, submitFromFooter, updateProfile.isPending],
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
    },
  ) => (
    <Controller
      key={name}
      control={control}
      name={name}
      rules={options?.rules}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput bordered
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
          <SheetHeader
            title="Edit profile"
            onClose={() => onClose?.()}
            closeLabel="Close edit profile"
            style={{ paddingHorizontal: 20 }}
          />

          <BottomSheetScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={expandSheet}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: SHEET_GROUP_GAP,
              paddingBottom: SHEET_GROUP_GAP - 12,
              gap: SHEET_SECTION_GAP,
            }}
          >
            {/* Avatar / Profile Photo Section */}
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity
                onPress={handlePickAvatar}
                activeOpacity={0.82}
                style={{ position: 'relative' }}
                disabled={uploadProfilePicture.isPending}
              >
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    overflow: 'hidden',
                    backgroundColor: COLORS.fillWeak,
                    borderWidth: 2,
                    borderColor: COLORS.strokeWeaker,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Avatar
                    uri={localAvatarUri || profile?.picture_url || profile?.picture}
                    userId={profile?._id} seed={profile?.email}
                    name={displayName}
                    size="xl"
                    className="w-full h-full border-0"
                  />
                  {uploadProfilePicture.isPending && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ActivityIndicator color={COLORS.textInverse} size="small" />
                    </View>
                  )}
                </View>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: COLORS.brand,
                    borderWidth: 2,
                    borderColor: COLORS.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: COLORS.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Camera size={16} color={COLORS.textInverse} strokeWidth={2} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickAvatar}
                activeOpacity={0.7}
                disabled={uploadProfilePicture.isPending}
                style={{ marginTop: 8 }}
              >
                <Text style={{ ...TYPE.bodySmall, color: COLORS.brand }}>
                  {uploadProfilePicture.isPending ? 'Uploading photo...' : 'Change profile photo'}
                </Text>
              </TouchableOpacity>
            </View>

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
                <Text style={[TYPE.label, { color: COLORS.textStrong }]}>
                  🇳🇬
                </Text>
              ),
            })}
            {field('country', 'Country')}
            {field('location', 'City/Location')}

            {updateProfile.isError && (
              <Text style={[TYPE.bodySmall, { color: COLORS.error }]}>
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
