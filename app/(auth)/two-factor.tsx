import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, Logo } from '@/components/ui';
import { useTwoFactorLogic } from '@/hooks/use-two-factor-logic';
import { FONTS } from '@/constants/tokens';

export default function TwoFactorScreen() {
  const {
    code,
    loading,
    error,
    inputRefs,
    handleDigit,
    handleKeyPress,
    handleSubmit,
    filled,
    router,
  } = useTwoFactorLogic();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-10">
            <Logo size="lg" />
          </View>

          {/* Header */}
          <View className="mb-10">
            <Animated.Text
              className="text-3xl text-text-strong mb-2"
              style={{ fontFamily: FONTS.serif }}
            >
              Two-factor auth
            </Animated.Text>
            <Animated.Text
              className="text-base text-text-base"
              style={{ fontFamily: FONTS.sans }}
            >
              Enter the 6-digit code from your authenticator app.
            </Animated.Text>
          </View>

          {/* OTP inputs */}
          <View className="flex-row gap-3 mb-6">
            {code.map((digit, i) => (
              <RNTextInput
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                value={digit}
                onChangeText={(v) => handleDigit(i, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                className="flex-1 h-14 rounded-xl border border-stroke-weak bg-fill-weaker text-center text-xl text-text-strong"
                style={{ textAlign: 'center', fontFamily: FONTS.sansSemi }}
              />
            ))}
          </View>

          {error ? (
            <View className="bg-error-weak rounded-xl px-4 py-3 mb-4">
              <Animated.Text
                className="text-sm text-error-strong"
                style={{ fontFamily: FONTS.sans }}
              >
                {error}
              </Animated.Text>
            </View>
          ) : null}

          <Button
            onPress={handleSubmit}
            loading={loading}
            disabled={!filled}
            fullWidth
            size="lg"
          >
            Verify
          </Button>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            className="mt-6 items-center"
          >
            <Animated.Text
              className="text-sm text-text-base"
              style={{ fontFamily: FONTS.sansMedium }}
            >
              Back to sign in
            </Animated.Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
