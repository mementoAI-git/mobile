import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, StyleSheet, Platform, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller } from 'react-hook-form';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ShieldCheck, AlertTriangle, Fingerprint } from 'lucide-react-native';
import { Button, TextInput } from '@/components/ui';
import { useAccountSettingsLogic } from '@/hooks/use-account-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useUserStore } from '@/store';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

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
    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    try {
      const enabled = await SecureStore.getItemAsync('memento.biometrics_enabled');
      setBiometricsEnabled(enabled === 'true');
    } catch {
      setBiometricsEnabled(false);
    }
  }

  async function handleToggleBiometrics() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (biometricsEnabled) {
      try {
        await SecureStore.deleteItemAsync('memento.biometrics_password');
        await SecureStore.deleteItemAsync('memento.biometrics_email');
        await SecureStore.setItemAsync('memento.biometrics_enabled', 'false');
        setBiometricsEnabled(false);
        Alert.alert('Disabled', 'Biometric login disabled.');
      } catch {
        Alert.alert('Error', 'Could not disable biometrics. Please try again.');
      }
    } else {
      setConfirmPassword('');
      setConfirmError('');
      setPasswordModalVisible(true);
    }
  }

  async function enrollBiometrics() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      await SecureStore.setItemAsync('memento.biometrics_password', pwd, {
        requireAuthentication: true,
      });
      await SecureStore.setItemAsync('memento.biometrics_email', email);
      await SecureStore.setItemAsync('memento.biometrics_enabled', 'true');
      setBiometricsEnabled(true);
      setPasswordModalVisible(false);
      Alert.alert('Success', 'Face ID / Touch ID successfully enrolled!');
    } catch (err) {
      Alert.alert(
        'Enrollment Failed',
        'Biometric authentication could not be registered on this device. Please verify that Face ID, Touch ID, or a passcode is configured in your system settings.'
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4">
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) { router.back(); } else { router.replace('/settings'); } }}
          className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center shadow-sm"
        >
          <ChevronLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <Animated.Text
          className="text-[28px] text-text-strong"
          style={{ fontFamily: FONTS.serif }}
        >
          Security
        </Animated.Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-12">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        <View className="px-6 gap-8">
          {/* Change Password Card */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.cardShadow}>
            <View className="bg-white rounded-[32px] border border-stroke-weaker p-6 gap-6">
              <View className="flex-row items-center gap-3 mb-2">
                <View className="size-10 rounded-2xl bg-brand-tint items-center justify-center">
                  <ShieldCheck size={20} color={COLORS.brand} />
                </View>
                <View>
                  <Animated.Text className="text-lg text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>Update Password</Animated.Text>
                  <Animated.Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sans }}>Ensure your account is secure</Animated.Text>
                </View>
              </View>

              <View className="gap-4">
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
                  <Animated.View entering={FadeInDown} className="bg-error-weak/30 border border-error-weak rounded-2xl px-4 py-3">
                    <Animated.Text className="text-sm text-error-strong text-center" style={{ fontFamily: FONTS.sans }}>
                      {(error as any).message}
                    </Animated.Text>
                  </Animated.View>
                )}

                {isSuccess && (
                  <Animated.View 
                    entering={FadeInDown} 
                    className="rounded-2xl px-4 py-3 border"
                    style={{ backgroundColor: `${COLORS.success}10`, borderColor: `${COLORS.success}20` }}
                  >
                    <Animated.Text className="text-sm text-center" style={{ fontFamily: FONTS.sans, color: COLORS.success }}>
                      Password updated successfully.
                    </Animated.Text>
                  </Animated.View>
                )}

                <Button onPress={onSubmit} loading={isPending} fullWidth size="lg" className="mt-2">
                  Save Changes
                </Button>
              </View>
            </View>
          </Animated.View>

          {/* Biometrics Toggle Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.cardShadow}>
            <View className="bg-white rounded-[32px] border border-stroke-weaker p-6">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="size-10 rounded-2xl bg-brand-tint items-center justify-center">
                    <Fingerprint size={20} color={COLORS.brand} />
                  </View>
                  <View style={{ maxWidth: '70%' }}>
                    <Animated.Text className="text-lg text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>
                      Biometric Login
                    </Animated.Text>
                    <Animated.Text className="text-xs text-text-weak leading-relaxed mt-0.5" style={{ fontFamily: FONTS.sans }}>
                      Authenticate using Face ID or Touch ID on app sign-in
                    </Animated.Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleToggleBiometrics}
                  activeOpacity={0.8}
                  className={`w-14 h-8 rounded-full p-1 ${
                    biometricsEnabled ? 'bg-brand items-end' : 'bg-fill-weaker border border-stroke-weaker items-start'
                  }`}
                >
                  <View className="size-6 rounded-full shadow-sm bg-white" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Danger Zone Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.cardShadow}>
            <View 
              className="rounded-[32px] border p-6 gap-4"
              style={{ backgroundColor: `${COLORS.error}05`, borderColor: `${COLORS.error}15` }}
            >
              <View className="flex-row items-center gap-3">
                <View className="size-10 rounded-2xl items-center justify-center" style={{ backgroundColor: `${COLORS.error}15` }}>
                  <AlertTriangle size={20} color={COLORS.error} />
                </View>
                <Animated.Text className="text-lg" style={{ fontFamily: FONTS.sansSemi, color: COLORS.error }}>Danger Zone</Animated.Text>
              </View>
              
              <Animated.Text className="text-sm text-text-base leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                Permanently delete your account. This action is irreversible. All your digital memories, capsules, and trusted connections will be permanently removed.
              </Animated.Text>

              <Button
                onPress={handleDelete}
                loading={deleting}
                variant="destructive"
                fullWidth
                size="lg"
                className="mt-2"
              >
                Delete Account
              </Button>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Password Confirmation Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-[32px] p-6 gap-5 border border-stroke-weaker">
            <View className="items-center gap-2">
              <Fingerprint size={36} color={COLORS.brand} />
              <Animated.Text className="text-xl text-text-strong font-serif text-center" style={{ fontFamily: FONTS.serif }}>
                Enable Biometric Login
              </Animated.Text>
              <Animated.Text className="text-sm text-text-weak text-center leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                Please confirm your account password to securely register biometric access on this device.
              </Animated.Text>
            </View>

            <TextInput
              label="Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              error={confirmError}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                className="flex-1 h-12 rounded-2xl border border-stroke-weak items-center justify-center bg-white"
              >
                <Animated.Text className="text-sm text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>
                  Cancel
                </Animated.Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={enrollBiometrics}
                className="flex-1 h-12 rounded-2xl bg-brand items-center justify-center shadow-sm"
              >
                <Animated.Text className="text-sm text-white font-bold" style={{ fontFamily: FONTS.sansBold }}>
                  Confirm
                </Animated.Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#170B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
