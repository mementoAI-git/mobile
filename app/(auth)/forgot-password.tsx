import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, TextInput, Logo } from '@/components/ui';
import { useForgotPasswordLogic } from '@/hooks/use-forgot-password-logic';
import { COLORS, FONTS } from '@/constants/tokens';

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

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Animated.Text className="text-5xl mb-6">📬</Animated.Text>
        <Animated.Text
          className="text-2xl text-text-strong text-center mb-3"
          style={{ fontFamily: FONTS.serif }}
        >
          Check your inbox
        </Animated.Text>
        <Animated.Text
          className="text-base text-text-weak text-center mb-8"
          style={{ fontFamily: FONTS.sans }}
        >
          We've sent a reset link to {email}. Check your email and follow the instructions.
        </Animated.Text>
        <Button onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(auth)/login'); } }} variant="outline" fullWidth>
          Back to Sign In
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 48, justifyContent: 'center', flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          <View className="items-center mb-10">
            <Logo size="lg" />
          </View>

          <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(auth)/login'); } }} className="mb-6">
            <Animated.Text
              className="text-sm text-brand"
              style={{ fontFamily: FONTS.sansMedium }}
            >
              ← Back to Sign In
            </Animated.Text>
          </TouchableOpacity>

          <View className="mb-10">
            <Animated.Text
              className="text-3xl text-text-strong mb-2"
              style={{ fontFamily: FONTS.serif }}
            >
              Reset password
            </Animated.Text>
            <Animated.Text
              className="text-base text-text-base"
              style={{ fontFamily: FONTS.sans }}
            >
              Enter your email and we'll send you a reset link.
            </Animated.Text>
          </View>

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
                  className="text-sm text-error-strong"
                  style={{ fontFamily: FONTS.sans }}
                >
                  {(error as any).message ?? 'Failed to send reset link. Please try again.'}
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
  );
}
