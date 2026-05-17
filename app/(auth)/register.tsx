import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, TextInput, PasswordInput, Logo } from '@/components/ui';
import { useRegisterLogic } from '@/hooks/use-register-logic';
import { FONTS } from '@/constants/tokens';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function RegisterScreen() {
  const {
    form: { control, formState: { errors } },
    isPending,
    error,
    onSubmit,
    router,
  } = useRegisterLogic();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ImageBackground source={PATTERN} className="absolute inset-0 opacity-40" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo wordmark */}
          <Logo size="md" className="mb-10" />

          <View className="mb-10">
            <Animated.Text
              className="text-[40px] text-text-strong mb-2"
              style={{ fontFamily: FONTS.serif }}
            >
              Create account
            </Animated.Text>
            <Animated.Text
              className="text-lg text-text-base leading-relaxed"
              style={{ fontFamily: FONTS.sans }}
            >
              Start preserving your memories
            </Animated.Text>
          </View>

          <View className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="First name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.first_name?.message}
                      placeholder="Jane"
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="last_name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Last name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.last_name?.message}
                      placeholder="Doe"
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                  placeholder="you@example.com"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  placeholder="At least 8 characters"
                />
              )}
            />

            {error && (
              <View className="bg-error-weak border border-error-weak rounded-2xl px-4 py-3">
                <Animated.Text className="text-sm text-error-strong text-center" style={{ fontFamily: FONTS.sansMedium }}>
                  {(error as any).message ?? 'Registration failed. Please try again.'}
                </Animated.Text>
              </View>
            )}

            <Button
              onPress={onSubmit}
              loading={isPending}
              fullWidth
              size="lg"
              className="mt-2"
            >
              Create Account
            </Button>
          </View>

          <View className="flex-row items-center justify-center gap-2 mt-10">
            <Animated.Text className="text-base text-text-weak" style={{ fontFamily: FONTS.sans }}>
              Already have an account?
            </Animated.Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Animated.Text className="text-base text-brand font-bold" style={{ fontFamily: FONTS.sansBold }}>
                Sign in
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
