import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ShieldCheck, AlertTriangle, Fingerprint } from 'lucide-react-native';
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
        <Text className="text-[15px] text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>
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
      // Disable — just delete the stored refresh_token
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
      // Store the refresh_token behind biometric authentication.
      // The OS biometric prompt fires here — no password required.
      // v2: replace with native WebAuthn passkey. See TODO.md.
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
      // User cancelled the biometric prompt or it failed
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
        <Text className="text-[28px] text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Security
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-6 pb-16 gap-6">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {/* ── Change Password ─────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-[11px] text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>
            Update Password
          </Text>

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
        </View>

        {/* ── Device Access ────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-[11px] text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>
            Device Access
          </Text>

          <View className="bg-white rounded-[32px]">
            <SettingsRow
              icon={<Fingerprint size={20} color={COLORS.brand} strokeWidth={1.5} />}
              iconBg={COLORS.brandSubtle}
              label="Face ID / Touch ID"
              description={enrolling ? 'Awaiting biometric confirmation…' : undefined}
              right={
                <Switch
                  value={biometricsEnabled}
                  onValueChange={handleToggleBiometrics}
                  disabled={enrolling}
                />
              }
            />
          </View>
        </View>

        {/* ── Danger Zone ──────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-[11px] text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>
            Danger Zone
          </Text>

          <View className="bg-white rounded-[20px] border p-5 gap-3" style={{ borderColor: `${COLORS.error}20` }}>
            <View className="flex-row items-center gap-3">
              <View className="size-11 rounded-2xl items-center justify-center" style={{ backgroundColor: `${COLORS.error}10` }}>
                <AlertTriangle size={20} color={COLORS.error} strokeWidth={1.5} />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] text-error-strong" style={{ fontFamily: FONTS.sansMedium }}>
                  Delete Account
                </Text>
              </View>
            </View>
            <Button onPress={handleDelete} loading={deleting} variant="destructive" fullWidth size="lg">
              Delete My Account
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* No modal needed — biometric prompt is triggered natively by SecureStore */}
    </SafeAreaView>
  );
}
