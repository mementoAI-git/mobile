import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { UiShieldTick, UiShieldOff, UiPhone01, UiCopy01 } from '@/components/ui/icons/SettingsIcons';
import { Button, TextInput } from '@/components/ui';
import { useTwoFactorSettingsLogic } from '@/hooks/use-two-factor-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function TwoFactorScreen() {
  const {
    is2FAEnabled,
    setupData,
    token,
    setToken,
    loading,
    error,
    handleSetup,
    handleVerify,
    handleDisable,
    router,
  } = useTwoFactorSettingsLogic();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4">
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) { router.back(); } else { router.replace('/settings'); } }}
          className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
        >
          <ChevronLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={TYPE.screenTitle}>
            Two-Factor Auth
          </Text>
          <Text style={TYPE.bodySmall}>
            Add a second layer of protection
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-6 pb-16 gap-5">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {/* Status card */}
        <Animated.View entering={FadeInDown.duration(500)} className="bg-white rounded-[32px] flex-row items-center gap-4 px-5 py-5">
          <View
            className="size-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: is2FAEnabled ? `${COLORS.success}10` : COLORS.fillWeak }}
          >
            {is2FAEnabled
              ? <UiShieldTick size={22} color={COLORS.success} strokeWidth={1.5} />
              : <UiShieldOff size={22} color={COLORS.textMuted} strokeWidth={1.5} />
            }
          </View>
          <View className="flex-1">
            <Text style={TYPE.cardTitle}>
              {is2FAEnabled ? 'Enabled' : 'Not enabled'}
            </Text>
            <Text className="mt-0.5" style={TYPE.bodySmall}>
              {is2FAEnabled
                ? 'Your account is protected with a second factor'
                : 'Protect your account with an authenticator app'}
            </Text>
          </View>
        </Animated.View>

        {/* Enable button */}
        {!is2FAEnabled && !setupData && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Button onPress={handleSetup} loading={loading} fullWidth size="lg">
              Enable Two-Factor Auth
            </Button>
          </Animated.View>
        )}

        {/* Disable */}
        {is2FAEnabled && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Button onPress={handleDisable} loading={loading} variant="destructive" fullWidth size="lg">
              Disable Two-Factor Auth
            </Button>
          </Animated.View>
        )}

        {/* Setup flow */}
        {setupData && (
          <Animated.View entering={FadeInDown.delay(150).duration(500)} className="bg-white rounded-[32px] p-6 gap-5">
            <View style={{ gap: 2 }}>
              <Text className="text-text-muted uppercase tracking-[2px]" style={TYPE.metadata}>
                Setup
              </Text>
              <Text className="text-text-weak" style={TYPE.bodySmall}>
                Scan the QR code in your authenticator app, or copy the secret key below.
              </Text>
            </View>

            <View className="flex-row items-start gap-3">
              <View className="size-11 rounded-2xl bg-brand/10 items-center justify-center shrink-0">
                <UiPhone01 size={20} color={COLORS.brand} strokeWidth={1.5} />
              </View>
              <Text className="text-text-weak flex-1" style={TYPE.bodySmall}>
                Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code, or enter the secret key manually.
              </Text>
            </View>

            {setupData.secret && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={async () => {
                  Haptics.selectionAsync();
                  await Clipboard.setStringAsync(setupData.secret ?? '');
                }}
                className="bg-fill-weaker rounded-2xl p-4 border border-stroke-weaker flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-text-muted uppercase tracking-[2px] mb-1.5" style={TYPE.eyebrow}>
                    Tap to copy the secret key
                  </Text>
                  <Text className="text-text-strong tracking-[2px]" style={TYPE.mono}>
                    {setupData.secret}
                  </Text>
                </View>
                <UiCopy01 size={18} color={COLORS.textMuted} strokeWidth={1.5} />
              </TouchableOpacity>
            )}

            <TextInput
              label="Verification code"
              value={token}
              onChangeText={setToken}
              keyboardType="number-pad"
              placeholder="000 000"
              maxLength={6}
            />

            {error && (
              <View className="rounded-2xl px-4 py-3 border" style={{ backgroundColor: `${COLORS.error}08`, borderColor: `${COLORS.error}20` }}>
                <Text style={[TYPE.bodySmall, { color: COLORS.error }]}>{error}</Text>
              </View>
            )}

            <Button onPress={handleVerify} loading={loading} disabled={token.length !== 6} fullWidth size="lg">
              Verify & Enable
            </Button>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
