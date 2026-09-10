import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, TextInput, Logo } from '@/components/ui';
import { useSetPasswordLogic } from '@/hooks/use-set-password-logic';
import { FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

export default function SetPasswordScreen() {
  const {
    form: { control, formState: { errors } },
    isPending,
    error,
    isSuccess,
    onSubmit,
    router,
  } = useSetPasswordLogic();

  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Animated.Text className="mb-6" style={TYPE.displayTitle}>🔐</Animated.Text>
        <Animated.Text
          className=" text-text-strong text-center mb-3" style={TYPE.screenTitle}
        >
          Password updated!
        </Animated.Text>
        <Animated.Text
          className="text-text-weak text-center mb-8"
          style={TYPE.body}>
          Your new password is set. You can now sign in.
        </Animated.Text>
        <Button onPress={() => router.replace('/(auth)/login')} fullWidth size="lg">Sign in</Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-10">
            <Logo size="lg" />
          </View>

          <View className="mb-10">
            <Animated.Text
              className=" text-text-strong mb-2" style={TYPE.screenTitle}
            >
              New password
            </Animated.Text>
            <Animated.Text
              className="text-text-base leading-relaxed"
              style={TYPE.bodyLarge}>
              Choose a strong new password.
            </Animated.Text>
          </View>

          <View className="gap-4">
            <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
              <TextInput label="New password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry error={errors.password?.message} placeholder="••••••••" />
            )} />
            <Controller control={control} name="confirm" render={({ field: { onChange, onBlur, value } }) => (
              <TextInput label="Confirm Password" value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry error={errors.confirm?.message} placeholder="••••••••" />
            )} />

            {error && (
              <View className="bg-error-tint border border-error-weak rounded-xl px-4 py-3">
                <Animated.Text
                  className="text-error-strong text-center"
                  style={TYPE.label}>
                  {(error as any).message ?? 'Couldn’t update your password. Try again.'}
                </Animated.Text>
              </View>
            )}

            <Button onPress={onSubmit} loading={isPending} fullWidth size="lg" className="mt-2">Update Password</Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
