import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ShieldCheck, ShieldOff, Smartphone, Copy } from 'lucide-react-native';
import { Button, TextInput } from '@/components/ui';
import { useTwoFactorSettingsLogic } from '@/hooks/use-two-factor-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';
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
        <Animated.Text className="text-[28px] text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Two-Factor Auth
        </Animated.Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-6 pb-16 gap-6">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {/* ── Status row ────────────────────────────────────────────────── */}
        <View className="gap-3">
          <Animated.Text className="text-[11px] font-bold text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>
            Status
          </Animated.Text>

          <View className="flex-row items-center gap-4 px-5 py-4 bg-white rounded-[20px] border border-stroke-weaker">
            <View
              className="size-11 rounded-2xl items-center justify-center"
              style={{ backgroundColor: is2FAEnabled ? `${COLORS.success}10` : COLORS.fillWeak }}
            >
              {is2FAEnabled
                ? <ShieldCheck size={20} color={COLORS.success} strokeWidth={1.5} />
                : <ShieldOff size={20} color={COLORS.textMuted} strokeWidth={1.5} />
              }
            </View>
            <View className="flex-1">
              <Animated.Text style={{ fontFamily: FONTS.sansMedium, fontSize: 15, color: COLORS.textStrong }}>
                {is2FAEnabled ? 'Authentication enabled' : 'Not enabled'}
              </Animated.Text>
              <Animated.Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak, marginTop: 1 }}>
                {is2FAEnabled
                  ? 'Your account is protected with a second factor'
                  : 'Add an extra layer of security to your account'}
              </Animated.Text>
            </View>
          </View>
        </View>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        {!is2FAEnabled && !setupData && (
          <Button onPress={handleSetup} loading={loading} fullWidth size="lg">
            Enable Two-Factor Auth
          </Button>
        )}

        {is2FAEnabled && (
          <View className="gap-3">
            <Animated.Text className="text-[11px] font-bold text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>
              Actions
            </Animated.Text>
            <View className="bg-white rounded-[20px] border p-5 gap-3" style={{ borderColor: `${COLORS.error}20` }}>
              <Animated.Text className="text-sm text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                Disabling 2FA reduces your account security. You can re-enable it at any time.
              </Animated.Text>
              <Button onPress={handleDisable} loading={loading} variant="destructive" fullWidth size="lg">
                Disable Two-Factor Auth
              </Button>
            </View>
          </View>
        )}

        {/* ── Setup flow ───────────────────────────────────────────────── */}
        {setupData && (
          <View className="gap-3">
            <Animated.Text className="text-[11px] font-bold text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>
              Setup Authenticator
            </Animated.Text>

            <View className="bg-white rounded-[20px] border border-stroke-weaker p-5 gap-4">
              <View className="flex-row items-start gap-3">
                <View className="size-11 rounded-2xl bg-brand/10 items-center justify-center shrink-0">
                  <Smartphone size={20} color={COLORS.brand} strokeWidth={1.5} />
                </View>
                <Animated.Text className="text-sm text-text-weak leading-relaxed flex-1" style={{ fontFamily: FONTS.sans }}>
                  Open an authenticator app (e.g. Google Authenticator or Authy) and scan the QR code, or enter the secret key manually.
                </Animated.Text>
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
                  <View>
                    <Animated.Text className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-1" style={{ fontFamily: FONTS.sansBold }}>
                      Secret Key — tap to copy
                    </Animated.Text>
                    <Animated.Text className="text-base text-text-strong tracking-[2px]" style={{ fontFamily: FONTS.mono }}>
                      {setupData.secret}
                    </Animated.Text>
                  </View>
                  <Copy size={18} color={COLORS.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              )}

              <TextInput
                label="Verification Code"
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                placeholder="000 000"
                maxLength={6}
              />

              {error && (
                <View className="rounded-2xl px-4 py-3 border" style={{ backgroundColor: `${COLORS.error}08`, borderColor: `${COLORS.error}20` }}>
                  <Animated.Text className="text-sm" style={{ fontFamily: FONTS.sans, color: COLORS.error }}>{error}</Animated.Text>
                </View>
              )}

              <Button onPress={handleVerify} loading={loading} disabled={token.length !== 6} fullWidth size="lg">
                Verify & Enable
              </Button>
            </View>
          </View>
        )}

        <View className="px-2">
          <Animated.Text className="text-center text-[10px] text-text-disabled leading-relaxed uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
            Two-factor authentication ensures only you can access your account.
          </Animated.Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
