import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller } from 'react-hook-form';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import { Button, TextInput } from '@/components/ui';
import { useAccountSettingsLogic } from '@/hooks/use-account-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4">
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
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
