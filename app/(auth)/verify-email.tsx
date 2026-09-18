import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import { Button, Logo } from '@/components/ui';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { useVerifyEmailLogic } from '@/hooks/use-verify-email-logic';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function VerifyEmailScreen() {
  const {
    email,
    code,
    setCode,
    isVerifying,
    isResending,
    errorMessage,
    resendNotice,
    secondsRemaining,
    handleVerify,
    handleResend,
    handleOpenMailbox,
    router,
  } = useVerifyEmailLogic();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top', 'bottom']}>
      <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
          <View>
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(auth)/login');
                }
              }}
              className="self-start -ml-2 p-2 mb-6"
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
            >
              <Text className="text-brand" style={TYPE.buttonSmall}>
                ← Back to sign in
              </Text>
            </TouchableOpacity>

            <View className="items-center mb-8">
              <Logo size="lg" />
            </View>

            {/* Heading & Subtitle */}
            <View className="mb-8">
              <Text
                className="text-text-strong text-center mb-2"
                style={TYPE.screenTitle}
              >
                Verify your email
              </Text>
              <Text
                className="text-text-weak text-center leading-relaxed"
                style={TYPE.body}
              >
                {email
                  ? `We’ve sent a 6-digit verification code to\n${email}`
                  : 'Enter the 6-digit verification code sent to your email.'}
              </Text>
            </View>

            {/* 6-Digit OTP Code Input */}
            <OtpCodeInput
              value={code}
              onChange={setCode}
              onComplete={(completedCode) => handleVerify(completedCode)}
              disabled={isVerifying}
              error={Boolean(errorMessage)}
              autoFocus
            />

            {/* Error Message */}
            {errorMessage ? (
              <View className="bg-error-tint border border-error-weak rounded-xl px-4 py-3 my-3">
                <Text
                  className="text-error-strong text-center"
                  style={TYPE.label}
                >
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Resend Notice */}
            {resendNotice ? (
              <View className="bg-fill-weaker border border-stroke-weaker rounded-xl px-4 py-3 my-3">
                <Text
                  className="text-text-base text-center"
                  style={TYPE.label}
                >
                  {resendNotice}
                </Text>
              </View>
            ) : null}

            {/* Resend Code Section */}
            <View className="flex-row items-center justify-center my-4">
              <Text className="text-text-weak mr-1.5" style={TYPE.bodySmall}>
                Didn’t receive a code?
              </Text>
              {secondsRemaining > 0 ? (
                <Text className="text-text-muted" style={TYPE.buttonSmall}>
                  Resend in 0:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending}
                  accessibilityRole="button"
                  accessibilityLabel="Resend verification code"
                >
                  <Text className="text-brand" style={TYPE.buttonSmall}>
                    {isResending ? 'Sending...' : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bottom Actions */}
          <View className="mt-8 gap-3">
            <Button
              onPress={() => handleVerify()}
              loading={isVerifying}
              disabled={code.length !== 6 || isVerifying}
              fullWidth
              size="lg"
            >
              Verify Code
            </Button>

            <Button
              variant="outline"
              onPress={handleOpenMailbox}
              fullWidth
              size="md"
              leftIcon={<Mail size={16} color={COLORS.textStrong} />}
            >
              Open mail app
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
