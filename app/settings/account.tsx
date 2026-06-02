import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Alert, Modal, Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ShieldCheck, AlertTriangle, Fingerprint, KeyRound } from 'lucide-react-native';
import { Button, TextInput } from '@/components/ui';
import { Switch } from '@/components/ui/Switch';
import { Controller } from 'react-hook-form';
import { useAccountSettingsLogic } from '@/hooks/use-account-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useUserStore } from '@/store';

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
    <View className="flex-row items-center gap-4 px-5 py-4 bg-white rounded-[20px] border border-stroke-weaker">
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

  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    SecureStore.getItemAsync('memento.biometrics_enabled').then((v) => {
      setBiometricsEnabled(v === 'true');
    });
  }, []);

  const handleToggleBiometrics = async (value: boolean) => {
    if (!value) {
      // Disable
      try {
        await SecureStore.deleteItemAsync('memento.biometrics_password');
        await SecureStore.deleteItemAsync('memento.biometrics_email');
        await SecureStore.setItemAsync('memento.biometrics_enabled', 'false');
        setBiometricsEnabled(false);
      } catch {
        Alert.alert('Error', 'Could not disable biometrics. Please try again.');
      }
    } else {
      setConfirmPassword('');
      setConfirmError('');
      setPasswordModalVisible(true);
    }
  };

  const enrollBiometrics = async () => {
    const pwd = confirmPassword.trim();
    if (pwd.length < 6) {
      setConfirmError('Please enter your valid password (minimum 6 characters).');
      return;
    }
    const email = user?.email;
    if (!email) {
      setConfirmError('User email not found. Please log in again.');
      return;
    }
    try {
      await SecureStore.setItemAsync('memento.biometrics_password', pwd, { requireAuthentication: true });
      await SecureStore.setItemAsync('memento.biometrics_email', email);
      await SecureStore.setItemAsync('memento.biometrics_enabled', 'true');
      setBiometricsEnabled(true);
      setPasswordModalVisible(false);
      Alert.alert('Success', 'Face ID / Touch ID successfully enrolled!');
    } catch {
      Alert.alert('Enrollment Failed', 'Biometric authentication could not be registered on this device.');
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

          <View className="gap-2">
            <Controller control={control} name="current_password" render={({ field: { onChange, onBlur, value } }) => (
              <TextInput label="Current Password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry error={errors.current_password?.message} />
            )} />
            <Controller control={control} name="new_password" render={({ field: { onChange, onBlur, value } }) => (
              <TextInput label="New Password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry error={errors.new_password?.message} />
            )} />
            <Controller control={control} name="confirm" render={({ field: { onChange, onBlur, value } }) => (
              <TextInput label="Confirm New Password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry error={errors.confirm?.message} />
            )} />
          </View>

          {error && (
            <View className="bg-fill-weaker rounded-2xl px-4 py-3 border border-stroke-weaker">
              <Text className="text-sm text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                {(error as any).message}
              </Text>
            </View>
          )}
          {isSuccess && (
            <View className="rounded-2xl px-4 py-3 border" style={{ backgroundColor: `${COLORS.success}08`, borderColor: `${COLORS.success}20` }}>
              <Text className="text-sm" style={{ fontFamily: FONTS.sans, color: COLORS.success }}>
                Password updated successfully.
              </Text>
            </View>
          )}

          <Button onPress={onSubmit} loading={isPending} fullWidth size="lg">
            Save Password
          </Button>
        </View>

        {/* ── Device Access ────────────────────────────────────────────── */}
        <View className="gap-3">
          <Text className="text-[11px] text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>
            Device Access
          </Text>

          <SettingsRow
            icon={<Fingerprint size={20} color={COLORS.brand} strokeWidth={1.5} />}
            iconBg={COLORS.brandSubtle}
            label="Face ID / Touch ID"
            right={
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBiometrics}
              />
            }
          />
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

      {/* Biometric enrollment modal */}
      <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-[32px] p-6 gap-5 border border-stroke-weaker">
            <View className="items-center gap-2">
              <Fingerprint size={36} color={COLORS.brand} />
              <Text className="text-xl text-text-strong text-center" style={{ fontFamily: FONTS.serif }}>
                Enable Biometric Login
              </Text>
              <Text className="text-sm text-text-weak text-center leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                Confirm your password to register biometric access on this device.
              </Text>
            </View>
            <TextInput label="Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" error={confirmError} />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                className="flex-1 h-12 rounded-2xl border border-stroke-weak items-center justify-center"
              >
                <Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={enrollBiometrics}
                className="flex-1 h-12 rounded-2xl bg-brand items-center justify-center"
              >
                <Text className="text-sm text-white" style={{ fontFamily: FONTS.sansBold }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
