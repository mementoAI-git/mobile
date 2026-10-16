import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { Button, Logo } from '@/components/ui';
import { useTwoFactorLogic } from '@/hooks/use-two-factor-logic';
import { FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

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
              className="text-text-strong mb-2"
              style={TYPE.screenTitle}
            >
              Two-factor auth
            </Animated.Text>
            <Animated.Text
              className="text-text-base"
              style={TYPE.body}
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
                className="flex-1 h-14 rounded-xl border border-stroke-weak bg-fill-weaker text-center text-text-strong"
                style={[TYPE.uiTitle, { textAlign: 'center' }]}
              />
            ))}
          </View>

          {error ? (
            <View className="bg-error-weak rounded-xl px-4 py-3 mb-4">
              <Animated.Text
                className="text-error-strong"
                style={TYPE.bodySmall}
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
              className="text-text-base"
              style={TYPE.buttonSmall}
            >
              Back to sign in
            </Animated.Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
