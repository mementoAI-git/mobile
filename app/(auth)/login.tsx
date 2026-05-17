import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, TextInput, PasswordInput, Logo } from '@/components/ui';
import { useLoginLogic } from '@/hooks/use-login-logic';
import { COLORS, FONTS } from '@/constants/tokens';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function LoginScreen() {
  const {
    form: { control, formState: { errors } },
    isPending,
    error,
    oauthLoading,
    onSubmit,
    handleGoogleLogin,
    router,
  } = useLoginLogic();

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

          {/* Header */}
          <View className="mb-10">
            <Animated.Text
              className="text-[40px] text-text-strong mb-2"
              style={{ fontFamily: FONTS.serif }}
            >
              Welcome back
            </Animated.Text>
            <Animated.Text
              className="text-lg text-text-base leading-relaxed"
              style={{ fontFamily: FONTS.sans }}
            >
              Sign in to continue your story
            </Animated.Text>
          </View>

          {/* Form */}
          <View className="gap-4">
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
                  autoComplete="email"
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
                  autoComplete="current-password"
                  error={errors.password?.message}
                  placeholder="••••••••"
                />
              )}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              className="self-end py-1"
            >
              <Animated.Text
                className="text-sm text-brand font-bold underline"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Forgot password?
              </Animated.Text>
            </TouchableOpacity>

            {error && (
              <View className="bg-error-weak border border-error-weak rounded-2xl px-4 py-3">
                <Animated.Text
                  className="text-sm text-error-strong text-center"
                  style={{ fontFamily: FONTS.sansMedium }}
                >
                  {(error as any).message ?? 'Login failed. Please try again.'}
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
              Sign In
            </Button>
          </View>

          {/* Divider */}
          <View className="flex-row items-center gap-4 my-8">
            <View className="flex-1 h-px bg-stroke-weaker" />
            <Animated.Text
              className="text-xs text-text-disabled uppercase tracking-widest"
              style={{ fontFamily: FONTS.sansBold }}
            >
              or
            </Animated.Text>
            <View className="flex-1 h-px bg-stroke-weaker" />
          </View>

          {/* Google OAuth */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={oauthLoading || isPending}
            className="flex-row items-center justify-center gap-3 border border-stroke-weaker rounded-full min-h-[52px] px-4 bg-card shadow-sm"
          >
            {oauthLoading ? (
              <ActivityIndicator size="small" color={COLORS.brand} />
            ) : (
              <Animated.Text style={{ fontSize: 18, lineHeight: 22 }}>
                <Animated.Text style={{ color: '#4285F4' }}>G</Animated.Text>
                <Animated.Text style={{ color: '#EA4335' }}>o</Animated.Text>
                <Animated.Text style={{ color: '#FBBC05' }}>o</Animated.Text>
                <Animated.Text style={{ color: '#4285F4' }}>g</Animated.Text>
                <Animated.Text style={{ color: '#34A853' }}>l</Animated.Text>
                <Animated.Text style={{ color: '#EA4335' }}>e</Animated.Text>
              </Animated.Text>
            )}
            <Animated.Text
              className="text-base text-text-strong font-semibold"
              style={{ fontFamily: FONTS.sansSemi }}
            >
              Continue with Google
            </Animated.Text>
          </TouchableOpacity>

          {/* Footer */}
          <View className="flex-row items-center justify-center gap-2 mt-10">
            <Animated.Text
              className="text-base text-text-weak"
              style={{ fontFamily: FONTS.sans }}
            >
              Don't have an account?
            </Animated.Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Animated.Text
                className="text-base text-brand font-bold"
                style={{ fontFamily: FONTS.sansBold }}
              >
                Sign up
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
