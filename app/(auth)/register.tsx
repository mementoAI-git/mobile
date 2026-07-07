import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  Text,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Button, TextInput, PasswordInput, Logo, ConfirmDialog } from '@/components/ui';
import { useRegisterLogic } from '@/hooks/use-register-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import { Fingerprint } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import { API_BASE_URL, PRIVACY_URL, TERMS_URL } from '@/lib/env';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

// ─── Easing presets ───────────────────────────────────────────────────────────
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN  = Easing.in(Easing.cubic);

export function GoogleSvgIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.09 3.59-5.17 3.59-8.46z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.27v3.1A12 12 0 0 0 12 24z" />
      <Path fill="#FBBC05" d="M5.24 14.24a7.15 7.15 0 0 1 0-4.48v-3.1H1.27a12 12 0 0 0 0 10.68l3.97-3.1z" />
      <Path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.66l3.97 3.1c.95-2.88 3.61-5.01 6.76-5.01z" />
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

export default function RegisterScreen() {
  const {
    form: { control, formState: { errors } },
    isPending,
    error,
    onSubmit,
    router,
  } = useRegisterLogic();

  const scrollViewRef = useRef<ScrollView>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [passkeyConfirmVisible, setPasskeyConfirmVisible] = useState(false);

  // ─── Cascade animation values ────────────────────────────────────────────
  // Each section has its own opacity + translateY shared value.
  // translateY > 0 = resting below (for fade-in), < 0 = exits upward (on hide).
  const logoOpacity    = useSharedValue(1);
  const logoY          = useSharedValue(0);
  const headingOpacity = useSharedValue(1);
  const headingY       = useSharedValue(0);
  const oauthOpacity   = useSharedValue(1);
  const dividerOpacity = useSharedValue(1);

  const logoStyle    = useAnimatedStyle(() => ({ opacity: logoOpacity.value,    transform: [{ translateY: logoY.value }] }));
  const headingStyle = useAnimatedStyle(() => ({ opacity: headingOpacity.value, transform: [{ translateY: headingY.value }] }));
  const oauthStyle   = useAnimatedStyle(() => ({ opacity: oauthOpacity.value }));
  const dividerStyle = useAnimatedStyle(() => ({ opacity: dividerOpacity.value }));

  const animateIn = () => {
    logoOpacity.value    = withDelay(0,   withTiming(0, { duration: 140, easing: EASE_IN }));
    logoY.value          = withDelay(0,   withTiming(-6, { duration: 140, easing: EASE_IN }));
    headingOpacity.value = withDelay(40,  withTiming(0, { duration: 170, easing: EASE_IN }));
    headingY.value       = withDelay(40,  withTiming(-4, { duration: 170, easing: EASE_IN }));
    oauthOpacity.value   = withDelay(90,  withTiming(0, { duration: 150, easing: EASE_IN }));
    dividerOpacity.value = withDelay(130, withTiming(0, { duration: 110, easing: EASE_IN }));
  };

  const animateOut = () => {
    dividerOpacity.value = withDelay(0,   withTiming(1, { duration: 180, easing: EASE_OUT }));
    oauthOpacity.value   = withDelay(30,  withTiming(1, { duration: 200, easing: EASE_OUT }));
    headingOpacity.value = withDelay(80,  withTiming(1, { duration: 230, easing: EASE_OUT }));
    headingY.value       = withDelay(80,  withTiming(0, { duration: 230, easing: EASE_OUT }));
    logoOpacity.value    = withDelay(140, withTiming(1, { duration: 260, easing: EASE_OUT }));
    logoY.value          = withDelay(140, withTiming(0, { duration: 260, easing: EASE_OUT }));
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      animateIn();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsKeyboardVisible(true);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 150);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      animateOut();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsKeyboardVisible(false);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handlePasskeySignup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPasskeyConfirmVisible(true);
  };

  const confirmPasskeyOpen = async () => {
    setPasskeyConfirmVisible(false);
    try {
      setPasskeyLoading(true);
      const webBase = API_BASE_URL.replace('/api', '');
      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(`${webBase}/signup`, 'memento://');
    } catch { /* silent */ } finally {
      setPasskeyLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    try {
      const res = await client.get(`${endpoint.oauth}google`, {
        params: { redirect_uri: 'memento://oauth-callback?provider=google' },
      });
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;
      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(url, 'memento://');
    } catch { /* silent */ } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAppleLoading(true);
    try {
      const res = await client.get(`${endpoint.oauth}apple`, {
        params: { redirect_uri: 'memento://oauth-callback?provider=apple' },
      });
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;
      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(url, 'memento://');
    } catch { /* silent */ } finally {
      setAppleLoading(false);
    }
  };

  return (
    <ImageBackground source={PATTERN} style={{ flex: 1, backgroundColor: COLORS.background }} imageStyle={{ opacity: 0.4 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {/* Logo — collapses away first */}
          {!isKeyboardVisible && (
            <Animated.View style={logoStyle} className="mb-10">
              <Logo size="md" />
            </Animated.View>
          )}

          {/* Heading — collapses second */}
          <Animated.View style={[headingStyle, { marginBottom: isKeyboardVisible ? 16 : 40 }]}>
            <Animated.Text className="text-[40px] text-text-strong mb-2" style={{ fontFamily: FONTS.serif }}>
              Create account
            </Animated.Text>
            <Animated.Text className="text-lg text-text-base leading-relaxed" style={{ fontFamily: FONTS.sans }}>
              Start preserving your memories
            </Animated.Text>
          </Animated.View>

          <View className="gap-4">
            {/* Full OAuth pills — only shown when keyboard is hidden */}
            {!isKeyboardVisible && (
              <Animated.View style={oauthStyle} className="gap-4">
                <TouchableOpacity
                  onPress={handlePasskeySignup}
                  disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center gap-3 rounded-full min-h-[50px] px-4 bg-fill-weaker"
                >
                  {passkeyLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <Fingerprint size={18} color={COLORS.textStrong} strokeWidth={2} />}
                  <Animated.Text className="text-base text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>Sign up with a passkey</Animated.Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleGoogleSignup}
                  disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center gap-3 rounded-full min-h-[50px] px-4 bg-fill-weaker"
                >
                  {googleLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <GoogleSvgIcon size={18} />}
                  <Animated.Text className="text-base text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>Continue with Google</Animated.Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAppleSignup}
                  disabled={googleLoading || appleLoading || passkeyLoading || isPending}
                  activeOpacity={0.8}
                  className="flex-row items-center justify-center gap-3 rounded-full min-h-[50px] px-4 bg-fill-weaker"
                >
                  {appleLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <AppleSvgIcon size={18} />}
                  <Animated.Text className="text-base text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>Continue with Apple</Animated.Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Divider — fades out last before fields */}
            <Animated.View style={dividerStyle} className="flex-row items-center gap-4 my-3">
              <View className="flex-1 h-[0.5px] bg-stroke-weaker" />
              <Animated.Text className="text-xs text-text-disabled lowercase" style={{ fontFamily: FONTS.sans }}>or</Animated.Text>
              <View className="flex-1 h-[0.5px] bg-stroke-weaker" />
            </Animated.View>

            {/* Name row */}
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

            <Button onPress={onSubmit} loading={isPending} fullWidth size="lg" className="mt-2">
              Create Account
            </Button>
          </View>

          <View className="items-center justify-center px-4 mt-6">
            <Text className="text-xs text-text-weak text-center leading-normal" style={{ fontFamily: FONTS.sans }}>
              By creating an account, you agree to our{' '}
              <Text
                className="text-brand underline font-semibold"
                onPress={() => Linking.openURL(TERMS_URL)}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                className="text-brand underline font-semibold"
                onPress={() => Linking.openURL(PRIVACY_URL)}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          <View className="flex-row items-center justify-center gap-2 mt-8">
            <Animated.Text className="text-base text-text-weak" style={{ fontFamily: FONTS.sans }}>
              Already have an account?
            </Animated.Text>
            <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(auth)/login'); } }}>
              <Animated.Text className="text-base text-brand font-bold" style={{ fontFamily: FONTS.sansBold }}>
                Sign in
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>

      <ConfirmDialog
        visible={passkeyConfirmVisible}
        title="Register with a passkey"
        message="To create a secure cross-device passkey, please use the Memento web portal. Would you like to open it now?"
        onClose={() => setPasskeyConfirmVisible(false)}
        buttons={[
          { label: 'Open web portal', variant: 'primary', onPress: confirmPasskeyOpen },
          { label: 'Not now', variant: 'ghost', onPress: () => setPasskeyConfirmVisible(false) },
        ]}
      />
    </ImageBackground>
  );
}
