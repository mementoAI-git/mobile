import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Button, TextInput, PasswordInput } from '@/components/ui';
import { useSetPasswordLogic } from '@/hooks/use-set-password-logic';
import { useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

function CelebrationBadge({ size = 100 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Center green circle */}
      <Circle cx="60" cy="60" r="24" fill="#22C55E" />
      {/* White checkmark */}
      <Path
        d="M51 60.5L57 66.5L69 54"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Confetti particles */}
      {/* Top particles */}
      <Circle cx="60" cy="22" r="2.5" fill="#EF4444" />
      <Path d="M50 25L52 29" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M68 23L70 27" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
      <Rect x="42" y="27" width="5" height="5" rx="1" fill="#06B6D4" transform="rotate(15 42 27)" />
      <Rect x="73" y="26" width="4" height="4" rx="1" fill="#10B981" transform="rotate(45 73 26)" />

      {/* Right particles */}
      <Circle cx="98" cy="60" r="2.5" fill="#EAB308" />
      <Path d="M92 48L96 50" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M93 72L97 74" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <Rect x="88" y="37" width="4" height="4" rx="1" fill="#EC4899" transform="rotate(30 88 37)" />
      <Rect x="87" y="78" width="5" height="4" rx="1" fill="#F97316" transform="rotate(-20 87 78)" />

      {/* Bottom particles */}
      <Circle cx="60" cy="98" r="2.5" fill="#06B6D4" />
      <Path d="M52 93L54 97" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M67 92L71 95" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <Rect x="44" y="87" width="5" height="4" rx="1" fill="#EAB308" transform="rotate(40 44 87)" />
      <Rect x="71" y="86" width="5" height="4" rx="1" fill="#06B6D4" transform="rotate(-15 71 86)" />

      {/* Left particles */}
      <Circle cx="22" cy="60" r="2.5" fill="#EC4899" />
      <Path d="M24 48L28 51" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M23 71L27 73" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <Rect x="27" y="36" width="5" height="5" rx="1" fill="#06B6D4" transform="rotate(-25 27 36)" />
      <Rect x="28" y="79" width="4" height="4" rx="1" fill="#EAB308" transform="rotate(20 28 79)" />

      {/* Inner ring dots */}
      <Circle cx="39" cy="46" r="2" fill="#06B6D4" />
      <Circle cx="81" cy="46" r="2" fill="#F97316" />
      <Circle cx="38" cy="74" r="2" fill="#10B981" />
      <Circle cx="82" cy="73" r="2" fill="#06B6D4" />
    </Svg>
  );
}

export default function SetPasswordScreen() {
  const {
    form: { control, formState: { errors } },
    isPending,
    error,
    isSuccess,
    onSubmit,
    router,
  } = useSetPasswordLogic();

  const { email } = useLocalSearchParams<{ email?: string }>();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      setShowSuccessModal(true);
    }
  }, [isSuccess]);

  return (
    <ImageBackground
      source={PATTERN}
      style={{ flex: 1, backgroundColor: COLORS.background }}
      imageStyle={{ opacity: 0.03 }}
      resizeMode="repeat"
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View>
              {/* Top Navigation Row: App Icon & Close Button */}
              <View className="flex-row items-center justify-between mb-8">
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoIcon}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace('/(auth)/login');
                    }
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Close and return to sign in"
                  className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
                >
                  <X size={18} color={COLORS.textStrong} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Editorial Title */}
              <Animated.View entering={FadeInDown.duration(400)} className="mb-6">
                <Text style={styles.titleText}>
                  Enter a new <Text style={styles.serifItalic}>password</Text>
                </Text>
                <Text style={styles.subtitleText}>
                  Enter your new password to finish off the process.
                </Text>
              </Animated.View>

              {/* Form Fields */}
              <Animated.View entering={FadeInDown.delay(100).duration(400)} className="gap-4">
                {email ? (
                  <TextInput
                    label="Email"
                    value={email}
                    editable={false}
                    variant="rounded"
                    placeholder="janedoe@mail.com"
                  />
                ) : null}

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PasswordInput
                      label="New Password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      variant="rounded"
                      placeholder="••••••••"
                      hint="A least 8 characters containing a number, Capitalized letter and a symbol."
                      error={errors.password?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="confirm"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PasswordInput
                      label="Confirm Password"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      variant="rounded"
                      placeholder="••••••••"
                      error={errors.confirm?.message}
                    />
                  )}
                />

                {error ? (
                  <View className="bg-fill-weak border border-error rounded-xl p-3 mt-1">
                    <Text style={styles.errorText}>
                      {(error as any).message ?? 'Couldn’t update your password. Try again.'}
                    </Text>
                  </View>
                ) : null}
              </Animated.View>
            </View>

            {/* Bottom CTA */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.bottomCtaContainer}>
              <Button
                onPress={onSubmit}
                loading={isPending}
                fullWidth
                size="lg"
                rounded="xl"
                className="!h-[52px] bg-brand"
              >
                Reset password
              </Button>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Success Bottom Sheet Overlay (Screenshot 4) */}
        {showSuccessModal ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={StyleSheet.absoluteFill}
            className="bg-black/40 justify-end"
          >
            <Animated.View
              entering={SlideInDown.duration(300)}
              className="bg-card rounded-t-[32px] px-6 pt-3 pb-8 items-center"
            >
              {/* Handle */}
              <View className="w-10 h-1 rounded-full bg-stroke-weaker self-center mb-6" />

              {/* Confetti celebration badge */}
              <View className="mb-4">
                <CelebrationBadge size={110} />
              </View>

              {/* Title */}
              <Text style={styles.successTitle}>
                Password reset successful
              </Text>

              {/* Description */}
              <Text style={styles.successSubtitle}>
                You can continue using Memento AI by logging in with your new password.
              </Text>

              {/* Action */}
              <Button
                onPress={() => router.replace('/(auth)/login')}
                fullWidth
                size="lg"
                rounded="xl"
                className="!h-[52px] bg-brand mt-6"
              >
                Done
              </Button>
            </Animated.View>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  titleText: {
    ...TYPE.displayTitle,
    color: COLORS.textStrong,
    marginBottom: 8,
  },
  serifItalic: {
    fontStyle: 'italic',
  },
  subtitleText: {
    ...TYPE.body,
    color: COLORS.textStrong,
    lineHeight: 22,
  },
  errorText: {
    ...TYPE.label,
    color: COLORS.error,
    textAlign: 'center',
  },
  bottomCtaContainer: {
    marginTop: 'auto',
    paddingTop: 32,
  },
  successTitle: {
    ...TYPE.uiTitle,
    color: COLORS.textStrong,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    ...TYPE.body,
    color: COLORS.textBase,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
});
