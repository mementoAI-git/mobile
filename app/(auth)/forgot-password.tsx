import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { Button, TextInput } from '@/components/ui';
import { useForgotPasswordLogic } from '@/hooks/use-forgot-password-logic';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function ForgotPasswordScreen() {
  const {
    email,
    setEmail,
    isPending,
    error,
    handleSubmit,
    router,
  } = useForgotPasswordLogic();

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
                  Forgot <Text style={styles.serifItalic}>password</Text>
                </Text>
                <Text style={styles.subtitleText}>
                  You need to reset your password if you have forgotten the current one. To continue, we will send a 6-digit code to your email address.
                </Text>
              </Animated.View>

              {/* Form Input */}
              <Animated.View entering={FadeInDown.delay(100).duration(400)} className="gap-4">
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholder="janedoe@mail.com"
                  variant="rounded"
                  error={error ? ((error as any).message ?? 'Couldn’t send the reset code. Try again.') : undefined}
                />
              </Animated.View>
            </View>

            {/* Bottom CTA Button */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.bottomCtaContainer}>
              <Button
                onPress={handleSubmit}
                loading={isPending}
                disabled={!email.trim() || isPending}
                fullWidth
                size="lg"
                rounded="xl"
                className="!h-[52px] bg-brand"
              >
                Send code
              </Button>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  bottomCtaContainer: {
    marginTop: 'auto',
    paddingTop: 32,
  },
});
