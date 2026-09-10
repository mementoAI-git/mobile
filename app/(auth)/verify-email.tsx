import React from 'react';
import { View, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, TextInput, Logo } from '@/components/ui';
import { useVerifyEmailLogic } from '@/hooks/use-verify-email-logic';
import { FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function VerifyEmailScreen() {
  const {
    token,
    setToken,
    isPending,
    error,
    isSuccess,
    handleVerify,
    router,
  } = useVerifyEmailLogic();

  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-40" />
        <View className="flex-1 items-center justify-center px-6">
          <Animated.Text className="mb-6" style={TYPE.displayTitle}>✅</Animated.Text>
          <Animated.Text
            className=" text-text-strong text-center mb-3" style={TYPE.screenTitle}
          >
            Email verified!
          </Animated.Text>
          <Animated.Text
            className="text-text-weak text-center mb-10 leading-relaxed"
            style={TYPE.bodyLarge}>
            Your email has been confirmed. You can now sign in.
          </Animated.Text>
          <Button onPress={() => router.replace('/(auth)/login')} fullWidth size="lg">
            Sign in
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ImageBackground source={PATTERN} className="absolute inset-0 opacity-40" />
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <Logo size="lg" />
        </View>

        <View className="mb-10">
          <Animated.Text
            className=" text-text-strong mb-2" style={TYPE.screenTitle}
          >
            Verify email
          </Animated.Text>
          <Animated.Text
            className="text-text-base leading-relaxed"
            style={TYPE.bodyLarge}>
            Enter the verification token from your email.
          </Animated.Text>
        </View>

        <View className="gap-4">
          <TextInput
            label="Verification Token"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            placeholder="Paste your token here"
          />

          {error && (
            <View className="bg-error-tint border border-error-weak rounded-xl px-4 py-3">
              <Animated.Text
                className="text-error-strong text-center"
                style={TYPE.label}>
                {(error as any).message ?? 'Verification failed. Please try again.'}
              </Animated.Text>
            </View>
          )}

          <Button
            onPress={handleVerify}
            loading={isPending}
            disabled={!token.trim()}
            fullWidth
            size="lg"
          >
            Verify Email
          </Button>
        </View>

        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.replace('/(auth)/login'); } }} className="mt-8 items-center">
          <Animated.Text
            className="text-text-base underline"
            style={TYPE.body}>
            Back to sign in
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
