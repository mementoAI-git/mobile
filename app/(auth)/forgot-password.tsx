import React, { useEffect, useRef } from 'react';
import {
  View,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Button, TextInput, Logo } from '@/components/ui';
import { useForgotPasswordLogic } from '@/hooks/use-forgot-password-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

// ─── Easing presets ───────────────────────────────────────────────────────────
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN  = Easing.in(Easing.cubic);

export default function ForgotPasswordScreen() {
  const {
    email,
    setEmail,
    sent,
    isPending,
    error,
    handleSubmit,
    router,
  } = useForgotPasswordLogic();

  const scrollViewRef = useRef<ScrollView>(null);

  // ─── Cascade animation values ────────────────────────────────────────────
  const logoOpacity    = useSharedValue(1);
  const logoY          = useSharedValue(0);
  const backOpacity    = useSharedValue(1);
  const backY          = useSharedValue(0);
  const headingOpacity = useSharedValue(1);
  const headingY       = useSharedValue(0);

  const logoStyle    = useAnimatedStyle(() => ({ opacity: logoOpacity.value,    transform: [{ translateY: logoY.value }] }));
  const backStyle    = useAnimatedStyle(() => ({ opacity: backOpacity.value,    transform: [{ translateY: backY.value }] }));
  const headingStyle = useAnimatedStyle(() => ({ opacity: headingOpacity.value, transform: [{ translateY: headingY.value }] }));

  const animateIn = () => {
    logoOpacity.value    = withDelay(0,  withTiming(0, { duration: 140, easing: EASE_IN }));
    logoY.value          = withDelay(0,  withTiming(-6, { duration: 140, easing: EASE_IN }));
    backOpacity.value    = withDelay(50, withTiming(0, { duration: 150, easing: EASE_IN }));
    backY.value          = withDelay(50, withTiming(-4, { duration: 150, easing: EASE_IN }));
    headingOpacity.value = withDelay(110, withTiming(0, { duration: 170, easing: EASE_IN }));
    headingY.value       = withDelay(110, withTiming(-4, { duration: 170, easing: EASE_IN }));
  };

  const animateOut = () => {
    headingOpacity.value = withDelay(0,   withTiming(1, { duration: 200, easing: EASE_OUT }));
    headingY.value       = withDelay(0,   withTiming(0, { duration: 200, easing: EASE_OUT }));
    backOpacity.value    = withDelay(70,  withTiming(1, { duration: 220, easing: EASE_OUT }));
    backY.value          = withDelay(70,  withTiming(0, { duration: 220, easing: EASE_OUT }));
    logoOpacity.value    = withDelay(140, withTiming(1, { duration: 260, easing: EASE_OUT }));
    logoY.value          = withDelay(140, withTiming(0, { duration: 260, easing: EASE_OUT }));
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      animateIn();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 150);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      animateOut();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Animated.Text className="mb-6" style={TYPE.displayTitle}>📬</Animated.Text>
        <Animated.Text
          className="text-text-strong text-center mb-3"
          style={TYPE.screenTitle}
        >
          Check your inbox
        </Animated.Text>
        <Animated.Text
          className="text-text-weak text-center mb-8"
          style={TYPE.bodyLarge}
        >
          We've sent a reset link to {email}. Check your email and follow the instructions.
        </Animated.Text>
        <Button onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(auth)/login'); } }} variant="outline" fullWidth>
          Back to sign in
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/backgrounds/welcome_bg.png')} style={{ flex: 1, backgroundColor: COLORS.background }} imageStyle={{ opacity: 0.4 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48, justifyContent: 'center', flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {/* Logo — collapses first */}
          <Animated.View style={[logoStyle, { alignItems: 'center', marginBottom: 40 }]}>
            <Logo size="lg" />
          </Animated.View>

          {/* Back link — collapses second */}
          <Animated.View style={[backStyle, { marginBottom: 24 }]}>
            <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(auth)/login'); } }}>
              <Animated.Text
                className="text-brand"
                style={TYPE.buttonSmall}
              >
                ← Back to sign in
              </Animated.Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Heading — collapses third */}
          <Animated.View style={[headingStyle, { marginBottom: 32 }]}>
            <Animated.Text
              className="text-text-strong mb-2"
              style={TYPE.screenTitle}
            >
              Reset password
            </Animated.Text>
            <Animated.Text
              className="text-text-base"
              style={TYPE.bodyLarge}
            >
              Enter your email and we'll send you a reset link.
            </Animated.Text>
          </Animated.View>

          {/* Fields — always visible */}
          <View className="gap-4">
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@example.com"
            />

            {error && (
              <View className="bg-error-weak rounded-xl px-4 py-3">
                <Animated.Text
                  className="text-error-strong"
                  style={TYPE.bodySmall}
                >
                  {(error as any).message ?? 'Couldn’t send the reset link. Try again.'}
                </Animated.Text>
              </View>
            )}

            <Button onPress={handleSubmit} loading={isPending} fullWidth size="lg" className="mt-2">
              Send Reset Link
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}
