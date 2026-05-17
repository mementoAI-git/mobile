import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, ShieldCheck, Smartphone, Copy } from 'lucide-react-native';
import { Button, TextInput } from '@/components/ui';
import { useTwoFactorSettingsLogic } from '@/hooks/use-two-factor-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';

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
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center shadow-sm"
        >
          <ChevronLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <Animated.Text
          className="text-[28px] text-text-strong"
          style={{ fontFamily: FONTS.serif }}
        >
          2FA
        </Animated.Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-12">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        <View className="px-6 gap-8">
          {/* Status Card */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.cardShadow}>
            <View className="bg-white rounded-[32px] border border-stroke-weaker p-6">
              <View className="flex-row items-center gap-4">
                <View 
                  className="size-14 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: is2FAEnabled ? `${COLORS.success}10` : COLORS.fillWeak }}
                >
                  <ShieldCheck size={28} color={is2FAEnabled ? COLORS.success : COLORS.textMuted} />
                </View>
                <View className="flex-1">
                  <Animated.Text className="text-lg text-text-strong leading-tight" style={{ fontFamily: FONTS.sansSemi }}>
                    {is2FAEnabled ? 'Authentication Active' : 'Extra Protection'}
                  </Animated.Text>
                  <Animated.Text className="text-xs text-text-weak mt-0.5" style={{ fontFamily: FONTS.sans }}>
                    {is2FAEnabled 
                      ? 'Secure access is enabled' 
                      : 'Add an extra layer of security'}
                  </Animated.Text>
                </View>
              </View>

              {!is2FAEnabled && !setupData && (
                <Button 
                  onPress={handleSetup} 
                  loading={loading} 
                  fullWidth 
                  size="lg" 
                  className="mt-8"
                >
                  Enable Protection
                </Button>
              )}

              {is2FAEnabled && (
                <Button 
                  onPress={handleDisable} 
                  loading={loading} 
                  variant="outline" 
                  fullWidth 
                  size="lg" 
                  className="mt-8"
                  style={{ borderColor: `${COLORS.error}20` }}
                >
                  <Animated.Text className="font-bold" style={{ fontFamily: FONTS.sansBold, color: COLORS.error }}>Disable 2FA</Animated.Text>
                </Button>
              )}
            </View>
          </Animated.View>

          {/* Setup Flow */}
          {setupData && (
            <Animated.View entering={FadeInDown.duration(600)} className="gap-6">
              <View className="bg-white rounded-[32px] border border-stroke-weaker p-6 gap-6">
                <View className="flex-row items-center gap-3">
                  <View className="size-10 rounded-2xl bg-brand-tint items-center justify-center">
                    <Smartphone size={20} color={COLORS.brand} />
                  </View>
                  <Animated.Text className="text-lg text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>Setup Authenticator</Animated.Text>
                </View>

                <Animated.Text className="text-sm text-text-base leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                  Install an authenticator app (like Google Authenticator or Authy) and scan the QR code or enter the secret key manually.
                </Animated.Text>

                {setupData.secret && (
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => Haptics.selectionAsync()}
                    className="bg-fill-weaker rounded-2xl p-4 border border-stroke-weak flex-row items-center justify-between"
                  >
                    <View>
                      <Animated.Text className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-1" style={{ fontFamily: FONTS.sansBold }}>Secret Key</Animated.Text>
                      <Animated.Text className="text-base text-text-strong tracking-[2px]" style={{ fontFamily: FONTS.mono }}>{setupData.secret}</Animated.Text>
                    </View>
                    <Copy size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}

                <View className="gap-4 pt-2">
                  <TextInput
                    label="Verification Code"
                    value={token}
                    onChangeText={setToken}
                    keyboardType="number-pad"
                    placeholder="000 000"
                    maxLength={6}
                    InputComponent={undefined} // Use standard for now or update if needed
                  />
                  
                  {error && (
                    <Animated.View 
                      entering={FadeInDown} 
                      className="rounded-2xl px-4 py-3 border"
                      style={{ backgroundColor: `${COLORS.error}10`, borderColor: `${COLORS.error}20` }}
                    >
                      <Animated.Text className="text-sm text-center" style={{ fontFamily: FONTS.sans, color: COLORS.error }}>{error}</Animated.Text>
                    </Animated.View>
                  )}

                  <Button 
                    onPress={handleVerify} 
                    loading={loading} 
                    disabled={token.length !== 6} 
                    fullWidth 
                    size="lg"
                  >
                    Complete Setup
                  </Button>
                </View>
              </View>
            </Animated.View>
          )}
        </View>

        <View className="px-10 mt-12">
          <Animated.Text className="text-center text-[10px] text-text-disabled leading-relaxed uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
            Two-factor authentication ensures that only you can access your digital legacy, even if someone knows your password.
          </Animated.Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#170B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
