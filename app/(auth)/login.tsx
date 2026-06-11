import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
  Keyboard,
  LayoutAnimation,
  TouchableWithoutFeedback,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, TextInput, PasswordInput, Logo } from '@/components/ui';
import { useLoginLogic } from '@/hooks/use-login-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import { Fingerprint } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

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

export function AppleSvgIcon({ size = 18 }: { size?: number }) {
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
    onSubmit,
    handleGoogleLogin,
    handleAppleLogin,
    handlePasskeyLogin,
    router,
  } = useLoginLogic();

  const [rememberMe, setRememberMe] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsKeyboardVisible(false);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ImageBackground source={PATTERN} className="absolute inset-0 opacity-40" />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerClassName="flex-grow px-6 pt-10 pb-16"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
            keyboardDismissMode="on-drag"
          >
            {/* Logo — hidden when keyboard is up so "Welcome back" slides to the top */}
            {!isKeyboardVisible && <Logo size="md" className="mb-10" />}

            {/* Header */}
            <View className={isKeyboardVisible ? 'mb-4' : 'mb-10'}>
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
                Please login to continue
              </Animated.Text>
            </View>

            {/* Form */}
            <View className="gap-4">
              {/* OAuth buttons — full pills when keyboard hidden, compact icon row when visible */}
              {isKeyboardVisible ? (
                /* Compact icon row */
                <View className="flex-row items-center justify-center gap-4 py-1">
                  <TouchableOpacity
                    onPress={handlePasskeyLogin}
                    disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                    activeOpacity={0.8}
                    className="items-center gap-1"
                  >
                    <View className="size-11 rounded-full border border-stroke-weak bg-white items-center justify-center">
                      {passkeyLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <Fingerprint size={20} color={COLORS.textStrong} strokeWidth={2} />}
                    </View>
                    <Animated.Text className="text-[10px] text-text-weak" style={{ fontFamily: FONTS.sans }}>Passkey</Animated.Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleGoogleLogin}
                    disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                    activeOpacity={0.8}
                    className="items-center gap-1"
                  >
                    <View className="size-11 rounded-full border border-stroke-weak bg-white items-center justify-center">
                      {googleLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <GoogleSvgIcon size={20} />}
                    </View>
                    <Animated.Text className="text-[10px] text-text-weak" style={{ fontFamily: FONTS.sans }}>Google</Animated.Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAppleLogin}
                    disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                    activeOpacity={0.8}
                    className="items-center gap-1"
                  >
                    <View className="size-11 rounded-full border border-stroke-weak bg-white items-center justify-center">
                      {appleLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <AppleSvgIcon size={20} />}
                    </View>
                    <Animated.Text className="text-[10px] text-text-weak" style={{ fontFamily: FONTS.sans }}>Apple</Animated.Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Full-width pills */
                <>
                  <TouchableOpacity
                    onPress={handlePasskeyLogin}
                    disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                    activeOpacity={0.8}
                    className="flex-row items-center justify-center gap-3 border border-stroke-weak rounded-full min-h-[50px] px-4 bg-white"
                  >
                    {passkeyLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <Fingerprint size={18} color={COLORS.textStrong} strokeWidth={2} />}
                    <Animated.Text className="text-base text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>Sign in with a passkey</Animated.Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleGoogleLogin}
                    disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                    activeOpacity={0.8}
                    className="flex-row items-center justify-center gap-3 border border-stroke-weak rounded-full min-h-[50px] px-4 bg-white"
                  >
                    {googleLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <GoogleSvgIcon size={18} />}
                    <Animated.Text className="text-base text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>Continue with Google</Animated.Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAppleLogin}
                    disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                    activeOpacity={0.8}
                    className="flex-row items-center justify-center gap-3 border border-stroke-weak rounded-full min-h-[50px] px-4 bg-white"
                  >
                    {appleLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <AppleSvgIcon size={18} />}
                    <Animated.Text className="text-base text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>Continue with Apple</Animated.Text>
                  </TouchableOpacity>
                </>
              )}

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

              {/* Email Field */}
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

              {/* Password Field */}
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

              {/* Remember for 30 days & Forgot Password Row */}
              <View className="flex-row items-center justify-between mt-1 mb-2">
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                  className="flex-row items-center gap-2"
                >
                  <View
                    className={`size-4 rounded-full border items-center justify-center ${
                      rememberMe ? 'border-brand bg-brand' : 'border-stroke-weak bg-white'
                    }`}
                  >
                    {rememberMe && <View className="size-1.5 rounded-full bg-white" />}
                  </View>
                  <Animated.Text
                    className="text-xs text-text-base"
                    style={{ fontFamily: FONTS.sans }}
                  >
                    Remember for 30 days
                  </Animated.Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  className="py-1"
                >
                  <Animated.Text
                    className="text-xs text-brand font-bold underline"
                    style={{ fontFamily: FONTS.sansBold }}
                  >
                    Forgot password?
                  </Animated.Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <Button
                onPress={onSubmit}
                loading={isPending}
                fullWidth
                size="lg"
                className="mt-2"
              >
                Login
              </Button>
            </View>

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
        </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
