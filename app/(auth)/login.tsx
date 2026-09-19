import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, TextInput, PasswordInput } from '@/components/ui';
import { useLoginLogic } from '@/hooks/use-login-logic';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Fingerprint, X } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export function GoogleSvgIcon({ size = 20 }: { size?: number }) {
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

export function AppleSvgIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#000000">
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
    </Svg>
  );
}

export default function LoginScreen() {
  const {
    form: { control, formState: { errors } },
    isPending,
    googleLoading,
    appleLoading,
    passkeyLoading,
    securityLoginLabel,
    isSecurityLoginAvailable,
    onSubmit,
    handleGoogleLogin,
    handleAppleLogin,
    handlePasskeyLogin,
    router,
  } = useLoginLogic();

  const [authError, setAuthError] = useState<string | null>(null);

  const handleFormSubmit = () => {
    setAuthError(null);
    onSubmit();
  };

  return (
    <ImageBackground
      source={PATTERN}
      style={{ flex: 1, backgroundColor: COLORS.background }}
      imageStyle={{ opacity: 0.03 }}
      resizeMode="repeat"
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Navigation */}
            <View className="flex-row items-center justify-between mb-8">
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(onboard)');
                  }
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close"
                className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
              >
                <X size={18} color={COLORS.textStrong} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Heading & Subtitle */}
            <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
              <Text style={styles.titleText}>
                Welcome <Text style={styles.serifItalic}>back</Text>
              </Text>
              <Text style={styles.subtitleText}>
                Please sign in to continue
              </Text>
            </Animated.View>

            {/* Auth options */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} className="gap-3">
              {/* Passkey button */}
              {isSecurityLoginAvailable && (
                <TouchableOpacity
                  onPress={handlePasskeyLogin}
                  disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center gap-3 rounded-xl min-h-[52px] px-4 bg-card border border-stroke-weak"
                >
                  {passkeyLoading ? (
                    <ActivityIndicator size="small" color={COLORS.brand} />
                  ) : (
                    <Fingerprint size={20} color={COLORS.textStrong} strokeWidth={2} />
                  )}
                  <Text style={styles.authButtonText}>{securityLoginLabel}</Text>
                </TouchableOpacity>
              )}

              {/* Google button */}
              <TouchableOpacity
                onPress={handleGoogleLogin}
                disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-3 rounded-xl min-h-[52px] px-4 bg-card border border-stroke-weak"
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={COLORS.brand} />
                ) : (
                  <GoogleSvgIcon size={20} />
                )}
                <Text style={styles.authButtonText}>Sign in with Google</Text>
              </TouchableOpacity>

              {/* Apple button */}
              <TouchableOpacity
                onPress={handleAppleLogin}
                disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                activeOpacity={0.8}
                className="flex-row items-center justify-center gap-3 rounded-xl min-h-[52px] px-4 bg-card border border-stroke-weak"
              >
                {appleLoading ? (
                  <ActivityIndicator size="small" color={COLORS.brand} />
                ) : (
                  <AppleSvgIcon size={20} />
                )}
                <Text style={styles.authButtonText}>Sign in with Apple</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} className="flex-row items-center gap-4 my-6">
              <View className="flex-1 h-[1px] bg-stroke-weaker" />
              <Text style={styles.dividerText}>Or</Text>
              <View className="flex-1 h-[1px] bg-stroke-weaker" />
            </Animated.View>

            {/* Form Fields */}
            <Animated.View entering={FadeInDown.delay(300).duration(400)} className="gap-4">
              {/* Email Field */}
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Email"
                    value={value}
                    onChangeText={(text) => {
                      if (authError) setAuthError(null);
                      onChange(text);
                    }}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={errors.email?.message}
                    placeholder="janedoe@mail.com"
                    variant="rounded"
                  />
                )}
              />

              {/* Password Field */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <PasswordInput
                    label="Password"
                    value={value}
                    onChangeText={(text) => {
                      if (authError) setAuthError(null);
                      onChange(text);
                    }}
                    onBlur={onBlur}
                    autoComplete="current-password"
                    error={errors.password?.message || (authError ?? undefined)}
                    placeholder="••••••••"
                    variant="rounded"
                  />
                )}
              />

              {/* Forgot Password Link */}
              <View className="items-end -mt-1 mb-1">
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  className="py-1"
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <Button
                onPress={handleFormSubmit}
                loading={isPending}
                fullWidth
                size="lg"
                rounded="xl"
                className="!h-[52px] bg-brand mt-1"
              >
                Sign in
              </Button>
            </Animated.View>

            {/* Footer Link */}
            <Animated.View entering={FadeInDown.delay(400).duration(400)} className="items-center mt-8">
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                className="py-2"
              >
                <Text style={styles.footerLinkText}>
                  I don’t have an account
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  titleText: {
    ...TYPE.displayTitle,
    color: COLORS.textStrong,
    marginBottom: 8,
  },
  serifItalic: {
    fontStyle: 'italic',
  },
  subtitleText: {
    ...TYPE.body,
    color: COLORS.textStrong,
    lineHeight: 22,
  },
  authButtonText: {
    ...TYPE.bodyStrong,
    color: COLORS.textStrong,
  },
  dividerText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
  },
  forgotPasswordText: {
    ...TYPE.bodyStrong,
    color: COLORS.brand,
  },
  footerLinkText: {
    ...TYPE.bodyStrong,
    color: COLORS.textStrong,
  },
});
