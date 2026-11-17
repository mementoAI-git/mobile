import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { Button, Logo } from '@/components/ui';
import { useTwoFactorLogic } from '@/hooks/use-two-factor-logic';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, responsiveSpace } from '@/constants/responsive';

export default function TwoFactorScreen() {
  const COLORS = useThemeColors();
  const { width } = useWindowDimensions();
  const isCompact = width < 375;
  const {
    code,
    loading,
    error,
    handleCodeChange,
    handleSubmit,
    filled,
    handleBackToSignIn,
  } = useTwoFactorLogic();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View className="px-4 py-4">
          <Logo size="sm" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingVertical: responsiveSpace(32),
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="w-full max-w-md self-center">
              <Button
                variant="ghost"
                onPress={handleBackToSignIn}
                className="self-start -ml-4 mb-4"
                textClassName="text-text-strong"
                leftIcon={<ArrowLeft size={iconSize(20)} color={COLORS.textStrong} />}
              >
                Back to sign in
              </Button>

              <View className="mb-6">
                <Text
                  accessibilityRole="header"
                  className="text-text-strong mb-2"
                  style={TYPE.screenTitle}
                >
                  Two-factor <Text style={{ fontStyle: 'italic' }}>authentication</Text>
                </Text>
                <Text className="text-text-base" style={TYPE.body}>
                  Enter the 6-digit code from your authenticator app.
                </Text>
              </View>

              <View className={isCompact ? 'mb-5' : 'px-4 mb-5'}>
                <OtpCodeInput
                  value={code}
                  onChange={handleCodeChange}
                  disabled={loading}
                  error={Boolean(error)}
                  autoFocus
                />
              </View>

              {error ? (
                <View className="bg-error-weak rounded-xl px-4 py-3 mb-4">
                  <Text
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    className="text-error-strong"
                    style={TYPE.bodySmall}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                onPress={handleSubmit}
                loading={loading}
                disabled={!filled}
                fullWidth
                rounded="lg"
              >
                Verify
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
