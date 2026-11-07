import { useThemeColors, useThemedStyles } from '@/hooks/use-theme-colors';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ImageBackground,
  Image,
  Keyboard,
  LayoutAnimation,
  Linking,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Button, TextInput, PasswordInput, toast } from '@/components/ui';
import { useRegisterLogic } from '@/hooks/use-register-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import client from '@/api/client';
import endpoint from '@/api/endpoint';
import { PRIVACY_URL, TERMS_URL } from '@/lib/env';
import { AUTH_SESSION_RETURN_URL, oauthCallbackUrl } from '@/lib/navigation';
import { signInWithGoogleNative } from '@/features/auth/google-auth';
import { signInWithAppleNative } from '@/features/auth/apple-auth';
import { establishSession } from '@/features/auth/session-coordinator';
import { completeAuthResponse } from '@/features/auth/auth-completion';
import { useAuthStore } from '@/store';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const APP_ICON = require('../../assets/icon.png');

// ─── Easing presets ───────────────────────────────────────────────────────────
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);

export function GoogleSvgIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.09 3.59-5.17 3.59-8.46z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.27v3.1A12 12 0 0 0 12 24z" />
      <Path fill="#FBBC05" d="M5.24 14.24a7.15 7.15 0 0 1 0-4.48v-3.1H1.27a12 12 0 0 0 0 10.68l3.97-3.1z" />
      <Path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.66l3.97 3.1c.95-2.88 3.61-5.01 6.76-5.01z" />
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

export default function RegisterScreen() {
  const COLORS = useThemeColors();
  const styles = useThemedStyles(stylesBase);
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;

  const {
    form: { control, formState: { errors } },
    isPending,
    onSubmit,
    router,
  } = useRegisterLogic();

  const scrollViewRef = useRef<ScrollView>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // ─── Cascade animation values ────────────────────────────────────────────
  const logoOpacity = useSharedValue(1);
  const logoY = useSharedValue(0);
  const headingOpacity = useSharedValue(1);
  const headingY = useSharedValue(0);
  const oauthOpacity = useSharedValue(1);
  const dividerOpacity = useSharedValue(1);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ translateY: logoY.value }] }));
  const headingStyle = useAnimatedStyle(() => ({ opacity: headingOpacity.value, transform: [{ translateY: headingY.value }] }));
  const oauthStyle = useAnimatedStyle(() => ({ opacity: oauthOpacity.value }));
  const dividerStyle = useAnimatedStyle(() => ({ opacity: dividerOpacity.value }));

  const animateIn = () => {
    logoOpacity.value = withDelay(0, withTiming(0, { duration: 140, easing: EASE_IN }));
    logoY.value = withDelay(0, withTiming(-6, { duration: 140, easing: EASE_IN }));
    headingOpacity.value = withDelay(40, withTiming(0, { duration: 170, easing: EASE_IN }));
    headingY.value = withDelay(40, withTiming(-4, { duration: 170, easing: EASE_IN }));
    oauthOpacity.value = withDelay(90, withTiming(0, { duration: 150, easing: EASE_IN }));
    dividerOpacity.value = withDelay(130, withTiming(0, { duration: 110, easing: EASE_IN }));
  };

  const animateOut = () => {
    dividerOpacity.value = withDelay(0, withTiming(1, { duration: 180, easing: EASE_OUT }));
    oauthOpacity.value = withDelay(30, withTiming(1, { duration: 200, easing: EASE_OUT }));
    headingOpacity.value = withDelay(80, withTiming(1, { duration: 230, easing: EASE_OUT }));
    headingY.value = withDelay(80, withTiming(0, { duration: 230, easing: EASE_OUT }));
    logoOpacity.value = withDelay(140, withTiming(1, { duration: 260, easing: EASE_OUT }));
    logoY.value = withDelay(140, withTiming(0, { duration: 260, easing: EASE_OUT }));
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

  const handleGoogleSignup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    try {
      const nativeResult = await signInWithGoogleNative();
      if (nativeResult.cancelled) {
        return;
      }
      if (nativeResult.success && nativeResult.idToken) {
        const res = await client.post(
          `${endpoint.oauth}google`,
          { id_token: nativeResult.idToken },
          { skipAuth: true } as never,
        );
        const completion = await completeAuthResponse(res.data, establishSession);
        if (completion.kind === 'session') {
          return;
        }
        if (completion.kind === 'two-factor-required') {
          useAuthStore.getState().setTwoFactorPendingToken(completion.token);
          router.push('/(auth)/two-factor');
          return;
        }
      }

      if (nativeResult.error) {
        toast(nativeResult.error, 'error');
        return;
      }

      const res = await client.get(`${endpoint.oauth}google`, {
        params: { redirect_uri: oauthCallbackUrl('google') },
        skipAuth: true,
      } as never);
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;
      const { openAuthSessionAsync } = await import('expo-web-browser');
      await openAuthSessionAsync(url, AUTH_SESSION_RETURN_URL);
    } catch {
      toast('Google sign up could not be completed. Please try again.', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAppleLoading(true);
    try {
      const nativeResult = await signInWithAppleNative();
      if (nativeResult.cancelled) {
        return;
      }
      if (nativeResult.success && nativeResult.identityToken) {
        const res = await client.post(
          `${endpoint.oauth}apple`,
          {
            id_token: nativeResult.identityToken,
            ...(nativeResult.user ? { user: nativeResult.user } : {}),
          },
          { skipAuth: true } as never,
        );
        const completion = await completeAuthResponse(res.data, establishSession);
        if (completion.kind === 'session') {
          return;
        }
        if (completion.kind === 'two-factor-required') {
          useAuthStore.getState().setTwoFactorPendingToken(completion.token);
          router.push('/(auth)/two-factor');
          return;
        }
      }

      if (nativeResult.error) {
        toast(nativeResult.error, 'error');
        return;
      }

      const res = await client.get(`${endpoint.oauth}apple`, {
        params: { redirect_uri: oauthCallbackUrl('apple') },
        skipAuth: true,
      } as never);
      const url: string | undefined = res.data?.data?.url;
      if (!url) return;
      const { openAuthSessionAsync } = await import('expo-web-browser');
    } catch {
      toast('Apple sign up could not be completed. Please try again.', 'error');
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <ImageBackground source={PATTERN} style={styles.screenBg} imageStyle={{ opacity: 0.03 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          >
            {/* Top Navigation Row: App Icon & Close Button */}
            <Animated.View style={[logoStyle, styles.topNavRow]}>
              <Image source={APP_ICON} style={styles.appIcon} resizeMode="cover" />
            </Animated.View>

            {/* Editorial Heading: "Create an account" */}
            <Animated.View style={[headingStyle, { marginBottom: isKeyboardVisible ? 16 : 28 }]}>
              <Animated.Text style={styles.titleText}>
                Create an <Animated.Text style={{ fontStyle: 'italic' }}>account</Animated.Text>
              </Animated.Text>
            </Animated.View>

            <View style={styles.formContainer}>
              {/* Full OAuth Buttons */}
              {!isKeyboardVisible && (
                <Animated.View style={[oauthStyle, styles.oauthContainer]}>
                  <TouchableOpacity
                    onPress={handleGoogleSignup}
                    disabled={googleLoading || appleLoading || isPending}
                    activeOpacity={0.8}
                    style={styles.socialBtn}
                  >
                    {googleLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <GoogleSvgIcon size={20} />}
                    <Text style={styles.socialBtnText}>Sign up with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleAppleSignup}
                    disabled={googleLoading || appleLoading || isPending}
                    activeOpacity={0.8}
                    style={styles.socialBtn}
                  >
                    {appleLoading ? <ActivityIndicator size="small" color={COLORS.brand} /> : <AppleSvgIcon size={20} />}
                    <Text style={styles.socialBtnText}>Sign up with Apple</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Divider: "Or" */}
              <Animated.View style={[dividerStyle, styles.dividerRow]}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or</Text>
                <View style={styles.dividerLine} />
              </Animated.View>

              {/* Name Row: Side-by-side First name & Last name */}
              <View style={[styles.nameRow, isCompact && styles.nameRowCompact]}>
                <View style={{ flex: 1 }}>
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
                        variant="rounded"
                        autoCapitalize="words"
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
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
                        variant="rounded"
                        autoCapitalize="words"
                      />
                    )}
                  />
                </View>
              </View>

              {/* Email */}
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
                    placeholder="janedoe@mail.com"
                    variant="rounded"
                  />
                )}
              />

              {/* Create Password */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <PasswordInput
                    label="Create Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    hint="At least 8 characters containing a number, capitalized letter and a symbol."
                    placeholder="••••••••"
                    variant="rounded"
                  />
                )}
              />

              {/* Primary CTA Button */}
              <Button
                onPress={onSubmit}
                loading={isPending}
                fullWidth
                size="lg"
                rounded="full"
                className="mt-3"
              >
                Create account
              </Button>
            </View>

            {/* "I already have an account" */}
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(auth)/login');
                }
              }}
              activeOpacity={0.7}
              style={styles.loginLinkContainer}
            >
              <Text style={styles.loginLinkText}>
                I already have an account
              </Text>
            </TouchableOpacity>

            {/* Legal Disclaimer */}
            <View style={styles.legalContainer}>
              <Text style={styles.legalText}>
                By Creating an account, you agree to our{'\n'}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(TERMS_URL)}
                >
                  Terms of Use
                </Text>
                {' and '}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(PRIVACY_URL)}
                >
                  Privacy Policy.
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const stylesBase = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  appIcon: {
    width: iconSize(44),
    height: iconSize(44),
    borderRadius: radius(12),
  },
  titleText: {
    ...TYPE.displayTitle,
    color: COLORS.textStrong,
  },
  formContainer: {
    gap: 16,
  },
  oauthContainer: {
    gap: 12,
  },
  socialBtn: {
    minHeight: minTouchTarget(52),
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  socialBtnText: {
    ...TYPE.button,
    color: COLORS.textStrong,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.strokeWeaker,
  },
  dividerText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameRowCompact: {
    flexDirection: 'column',
  },
  loginLinkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  loginLinkText: {
    ...TYPE.button,
    color: COLORS.textStrong,
  },
  legalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    paddingBottom: 8,
  },
  legalText: {
    ...TYPE.bodySmall,
    color: COLORS.textWeak,
    textAlign: 'center',
    lineHeight: 20,
  },
  legalLink: {
    ...TYPE.bodySmall,
    color: COLORS.brand,
  },
});

