import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { CalendarDays, Camera, X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import { Avatar, Button, TextInput } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';
import {
  normalizeProfileForm,
  toProfileUpdatePayload,
  resolveFileUrl,
  type ProfileFormValues,
} from '@/features/account/profile-form';
import { useUpdateProfile, useUploadProfilePicture } from '@/hooks/mutations/use-profile-mutation';
import { useProfile } from '@/hooks/queries/use-profile';
import { getSheetBottomPadding } from '@/features/layout/sheet-safe-area';

interface EditProfileSheetProps {
  onClose?: () => void;
  expandSheet: () => void;
}

export function EditProfileSheet({
  onClose,
  expandSheet,
}: EditProfileSheetProps) {
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadProfilePicture = useUploadProfilePicture();
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
          paddingBottom: getSheetBottomPadding(insets.bottom, 12),
          borderTopWidth: 1,
          borderTopColor: COLORS.strokeWeaker,
          backgroundColor: COLORS.background,
        }}
      >
        <Button
          variant="secondary"
          size="lg"
          className="h-14 flex-1"
                    onPress={onClose}
        >
          Dismiss
        </Button>
        <Button
          size="lg"
          className="h-14 flex-1"
                    loading={updateProfile.isPending}
          onPress={submitFromFooter}
        >
          Save changes
        </Button>
      </View>
    ),
    [insets.bottom, onClose, submitFromFooter, updateProfile.isPending],
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
          <Text style={TYPE.sectionTitle}>
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
            paddingTop: 8,
            paddingBottom: 20,
            gap: 16,
          }}
        >
          {/* Avatar / Profile Photo Section */}
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
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
                {localAvatarUri || resolveFileUrl(profile?.picture_url || profile?.picture) ? (
                  <Image
                    source={{ uri: localAvatarUri || resolveFileUrl(profile?.picture_url || profile?.picture)! }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Avatar
                    name={profile?.first_name || profile?.nickname || profile?.email || 'User'}
                    size="xl"
                    className="w-full h-full border-0"
                  />
                )}
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
              <Text style={[TYPE.label, {color: COLORS.textStrong}]}>
                🇳🇬
              </Text>
            ),
          })}
          {field('country', 'Country')}
          {field('location', 'City/Location')}
          {field('bio', 'About me', { multiline: true, numberOfLines: 3 })}

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
