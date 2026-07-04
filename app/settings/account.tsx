import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { UiFingerprint01, UiAlertTriangle, UiShieldTick } from '@/components/ui/icons/SettingsIcons';
import { Button, TextInput } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { Switch } from '@/components/ui/Switch';
import { Controller } from 'react-hook-form';
import { useAccountSettingsLogic } from '@/hooks/use-account-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore, useUserStore } from '@/store';
import { storageKeys } from '@/constants/storage-keys';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

// ── Shared settings row component ────────────────────────────────────────────
function SettingsRow({
  icon,
  iconBg,
  label,
  description,
  right,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-4 px-5 py-4 bg-white rounded-[20px]">
      <View className="size-11 rounded-2xl items-center justify-center" style={{ backgroundColor: iconBg }}>
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[15px] text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>
          {label}
        </Text>
        {description && (
          <Text className="text-xs text-text-weak leading-relaxed mt-0.5" style={{ fontFamily: FONTS.sans }}>
            {description}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

export default function AccountSettingsScreen() {
  const {
    form: { control, formState: { errors } },
    isPending,
    error,
    isSuccess,
    deleting,
    onSubmit,
    handleDelete,
    router,
  } = useAccountSettingsLogic();

  const { toast } = useToast();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const user = useUserStore((s) => s.user);
  const authToken = useAuthStore((s) => s.token);

  useEffect(() => {
    SecureStore.getItemAsync(storageKeys.biometricsEnabled).then((v) => {
      setBiometricsEnabled(v === 'true');
    });
  }, []);

  const handleToggleBiometrics = async (value: boolean) => {
    if (!value) {
      try {
        await SecureStore.deleteItemAsync(storageKeys.biometricsRefreshToken);
        await SecureStore.deleteItemAsync(storageKeys.biometricsEmail);
        await SecureStore.setItemAsync(storageKeys.biometricsEnabled, 'false');
        setBiometricsEnabled(false);
        toast('Biometric login disabled.', 'success');
      } catch {
        toast('Could not disable biometrics. Please try again.', 'error');
      }
    } else {
      await enrollBiometrics();
    }
  };

  const enrollBiometrics = async () => {
    const email = user?.email;
    const refreshToken = authToken?.refresh_token;

    if (!email || !refreshToken) {
      toast('Session not found. Please log out and back in.', 'error');
      return;
    }

    setEnrolling(true);
    try {
      await SecureStore.setItemAsync(
        storageKeys.biometricsRefreshToken,
        refreshToken,
        { requireAuthentication: true, authenticationPrompt: 'Authenticate to enable biometric login' },
      );
      await SecureStore.setItemAsync(storageKeys.biometricsEmail, email);
      await SecureStore.setItemAsync(storageKeys.biometricsEnabled, 'true');
      setBiometricsEnabled(true);
      toast('Face ID / Touch ID successfully enrolled!', 'success');
    } catch {
      toast('Biometric enrollment cancelled or unavailable on this device.', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4">
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) { router.back(); } else { router.replace('/settings'); } }}
          className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
        >
          <ChevronLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text className="text-[28px] text-text-strong" style={{ fontFamily: FONTS.serif }}>
            Security
          </Text>
          <Text className="text-[13px] text-text-weak" style={{ fontFamily: FONTS.sans }}>
            Keep your account safe and secure
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-6 pb-16 gap-6">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {/* ── Change Password ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500)} className="gap-3">
          <View style={{ gap: 2, paddingLeft: 4 }}>
            <Text className="text-[11px] text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
              Update Password
            </Text>
            <Text className="text-[13px] text-text-weak" style={{ fontFamily: FONTS.sans }}>
              Choose a strong, unique password
            </Text>
          </View>

          <View className="bg-white rounded-[32px] p-6 gap-4">
            <Controller control={control} name="current_password" render={({ field: { onChange, onBlur, value } }) => (
              <TextInput label="Current Password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry error={errors.current_password?.message} />
            )} />
            <Controller control={control} name="new_password" render={({ field: { onChange, onBlur, value } }) => (
              <TextInput label="New Password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry error={errors.new_password?.message} />
            )} />
            <Controller control={control} name="confirm" render={({ field: { onChange, onBlur, value } }) => (
              <TextInput label="Confirm New Password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry error={errors.confirm?.message} />
            )} />

            {error && (
              <View className="bg-fill-weaker rounded-2xl px-4 py-3">
                <Text className="text-sm text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                  {(error as any).message}
                </Text>
              </View>
            )}
            {isSuccess && (
              <View className="rounded-2xl px-4 py-3" style={{ backgroundColor: `${COLORS.success}08` }}>
                <Text className="text-sm" style={{ fontFamily: FONTS.sans, color: COLORS.success }}>
                  Password updated successfully.
                </Text>
              </View>
            )}

            <Button onPress={onSubmit} loading={isPending} fullWidth size="lg">
              Save Password
            </Button>
          </View>
        </Animated.View>

        {/* ── Device Access ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} className="gap-3">
          <View style={{ gap: 2, paddingLeft: 4 }}>
            <Text className="text-[11px] text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
              Device Access
            </Text>
            <Text className="text-[13px] text-text-weak" style={{ fontFamily: FONTS.sans }}>
              Sign in faster with your device biometrics
            </Text>
          </View>

          <View className="bg-white rounded-[32px]">
            <SettingsRow
              icon={<UiFingerprint01 size={20} color={COLORS.brand} strokeWidth={1.5} />}
              iconBg={COLORS.brandSubtle}
              label="Face ID / Touch ID"
              description={enrolling ? 'Awaiting biometric confirmation…' : 'Use biometrics to sign in instantly'}
              right={
                <Switch
                  value={biometricsEnabled}
                  onValueChange={handleToggleBiometrics}
                  disabled={enrolling}
                />
              }
            />
          </View>
        </Animated.View>

        {/* ── Danger Zone ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} className="gap-3">
          <View style={{ gap: 2, paddingLeft: 4 }}>
            <Text className="text-[11px] text-text-muted uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
              Danger Zone
            </Text>
            <Text className="text-[13px] text-text-weak" style={{ fontFamily: FONTS.sans }}>
              Permanent actions that cannot be undone
            </Text>
          </View>

          <View className="bg-white rounded-[20px] border p-5 gap-4" style={{ borderColor: `${COLORS.error}20` }}>
            <View className="flex-row items-center gap-3">
              <View className="size-11 rounded-2xl items-center justify-center" style={{ backgroundColor: `${COLORS.error}10` }}>
                <UiAlertTriangle size={20} color={COLORS.error} strokeWidth={1.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[16px]" style={{ fontFamily: FONTS.sansSemi, color: COLORS.error }}>
                  Delete Account
                </Text>
                <Text className="text-xs text-text-weak leading-relaxed mt-0.5" style={{ fontFamily: FONTS.sans }}>
                  All your memories, capsules and data will be permanently removed.
                </Text>
              </View>
            </View>
            <Button onPress={handleDelete} loading={deleting} variant="destructive" fullWidth size="lg">
              Delete My Account
            </Button>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
