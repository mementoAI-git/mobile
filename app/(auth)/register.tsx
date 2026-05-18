import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Text,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, TextInput, PasswordInput, Logo } from '@/components/ui';
import { useRegisterLogic } from '@/hooks/use-register-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import { Fingerprint } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import client from '@/api/client';
import endpoint from '@/api/endpoint';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export function GoogleSvgIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.09 3.59-5.17 3.59-8.46z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.27v3.1A12 12 0 0 0 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.24 14.24a7.15 7.15 0 0 1 0-4.48v-3.1H1.27a12 12 0 0 0 0 10.68l3.97-3.1z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.66l3.97 3.1c.95-2.88 3.61-5.01 6.76-5.01z"
      />
    </Svg>
  );
}

export default function RegisterScreen() {
  const {
    form: { control, formState: { errors } },
    isPending,
    error,
    onSubmit,
    router,
  } = useRegisterLogic();

  const [oauthLoading, setOauthLoading] = useState(false);

  const handleGoogleSignup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOauthLoading(true);
    try {
      const res = await client.get(`${endpoint.oauth}google`, {
        params: { redirect_uri: 'memento://oauth-callback?provider=google' },
      });
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;

      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(url, 'memento://');
    } catch {
      // silent
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ImageBackground source={PATTERN} className="absolute inset-0 opacity-40" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerClassName="flex-grow px-6 pt-10 pb-16"
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
              {/* Passkey Sign Up Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-3 border border-stroke-weak rounded-full min-h-[50px] px-4 bg-white"
              >
                <Fingerprint size={18} color={COLORS.textStrong} strokeWidth={2} />
                <Animated.Text
                  className="text-base text-text-strong font-semibold"
                  style={{ fontFamily: FONTS.sansSemi }}
                >
                  Sign up with a passkey
                </Animated.Text>
              </TouchableOpacity>

              {/* Google Signup Button */}
              <TouchableOpacity
                onPress={handleGoogleSignup}
                disabled={oauthLoading || isPending}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-3 border border-stroke-weak rounded-full min-h-[50px] px-4 bg-white"
              >
                {oauthLoading ? (
                  <ActivityIndicator size="small" color={COLORS.brand} />
                ) : (
                  <GoogleSvgIcon size={18} />
                )}
                <Animated.Text
                  className="text-base text-text-strong font-semibold"
                  style={{ fontFamily: FONTS.sansSemi }}
                >
                  Continue with Google
                </Animated.Text>
              </TouchableOpacity>

              {/* Divider */}
              <View className="flex-row items-center gap-4 my-3">
                <View className="flex-1 h-[0.5px] bg-stroke-weaker" />
                <Animated.Text
                  className="text-xs text-text-disabled lowercase"
                  style={{ fontFamily: FONTS.sans }}
                >
                  or
                </Animated.Text>
                <View className="flex-1 h-[0.5px] bg-stroke-weaker" />
              </View>

              {/* Credentials Fields */}
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

            {/* Legal Terms Link */}
            <View className="items-center justify-center px-4 mt-6">
              <Text
                className="text-xs text-text-weak text-center leading-normal"
                style={{ fontFamily: FONTS.sans }}
              >
                By creating an account, you agree to our{' '}
                <Text className="text-brand underline font-semibold">Terms of Service</Text> and{' '}
                <Text className="text-brand underline font-semibold">Privacy Policy</Text>.
              </Text>
            </View>

            <View className="flex-row items-center justify-center gap-2 mt-8">
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
