import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { OtpCodeInput } from '@/components/auth/OtpCodeInput';
import { useVerifyEmailLogic } from '@/hooks/use-verify-email-logic';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const APP_ICON = require('../../assets/icon.png');

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
    mode,
    router,
  } = useVerifyEmailLogic();

  return (
    <ImageBackground source={PATTERN} style={styles.screenBg} imageStyle={{ opacity: 0.03 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Container */}
            <View>
              {/* Top Navigation Row: App Icon & Close Button */}
              <View style={styles.topNavRow}>
                <Image source={APP_ICON} style={styles.appIcon} resizeMode="cover" />
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
                  accessibilityRole="button"
                  accessibilityLabel="Close and return to sign in"
                  style={styles.closeBtn}
                >
                  <X size={iconSize(18)} color={COLORS.textStrong} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Editorial Title: "Check your inbox" */}
              <View style={styles.titleContainer}>
                <Text style={styles.titleText}>
                  Check <Text style={{ fontStyle: 'italic' }}>your</Text> inbox
                </Text>
              </View>

              {/* Subtitle with email */}
              <View style={styles.subtitleContainer}>
                <Text style={styles.subtitleText}>
                  We’ve sent an OTP code to{' '}
                  <Text style={{ ...TYPE.bodyStrong, color: COLORS.textStrong }}>
                    {email || 'janedoe@mail.com'}
                  </Text>
                  .{'\n'}
                  Haven’t received an email? Try searching in the spam or social folder.
                </Text>
              </View>

              {/* 6-Digit OTP Code Input */}
              <View style={styles.otpWrapper}>
                <OtpCodeInput
                  value={code}
                  onChange={setCode}
                  onComplete={(completedCode) => handleVerify(completedCode)}
                  disabled={isVerifying}
                  error={Boolean(errorMessage)}
                  autoFocus
                />
              </View>

              {/* Error Message */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              {/* Resend Notice */}
              {resendNotice ? (
                <View style={styles.noticeBanner}>
                  <Text style={styles.noticeBannerText}>
                    {resendNotice}
                  </Text>
                </View>
              ) : null}

              {/* Resend Code Prompt */}
              <View style={styles.resendRow}>
                <Text style={styles.resendPromptText}>
                  Didn’t get a code?{' '}
                </Text>
                {secondsRemaining > 0 ? (
                  <Text style={styles.resendTimerText}>
                    Resend in 0:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={isResending}
                    accessibilityRole="button"
                    accessibilityLabel="Resend verification code"
                  >
                    <Text style={styles.resendActionText}>
                      {isResending ? 'Sending...' : 'Click to Resend'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Bottom Primary CTA */}
            <View style={styles.bottomCtaContainer}>
              <Button
                onPress={() => handleVerify()}
                loading={isVerifying}
                disabled={code.length !== 6 || isVerifying}
                fullWidth
                size="lg"
                rounded="xl"
                className="!h-[52px]"
              >
                {mode === 'reset-password' ? 'Reset password' : 'Confirm code'}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  closeBtn: {
    minWidth: minTouchTarget(44),
    minHeight: minTouchTarget(44),
    borderRadius: 999,
    backgroundColor: COLORS.fillWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 12,
  },
  titleText: {
    ...TYPE.displayTitle,
    color: COLORS.textStrong,
  },
  subtitleContainer: {
    marginBottom: 28,
  },
  subtitleText: {
    ...TYPE.body,
    color: COLORS.textStrong,
    lineHeight: 22,
  },
  otpWrapper: {
    marginVertical: 8,
  },
  errorBanner: {
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
  },
  errorBannerText: {
    ...TYPE.label,
    color: COLORS.error,
    textAlign: 'center',
  },
  noticeBanner: {
    backgroundColor: COLORS.fillWeaker,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
  },
  noticeBannerText: {
    ...TYPE.label,
    color: COLORS.textStrong,
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  resendPromptText: {
    ...TYPE.bodyStrong,
    color: COLORS.textStrong,
  },
  resendTimerText: {
    ...TYPE.bodyStrong,
    color: COLORS.textWeak,
  },
  resendActionText: {
    ...TYPE.bodyStrong,
    color: COLORS.brand,
  },
  bottomCtaContainer: {
    marginTop: 'auto',
    paddingTop: 32,
  },
});

