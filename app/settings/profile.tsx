import React from 'react';
import { View, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Shield, Eye, Users, Smartphone, Zap, MessageSquare, CreditCard, LogOut, Trophy, Flame } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Avatar, Button } from '@/components/ui';
import { useProfileSettingsLogic } from '@/hooks/use-profile-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';

const HEADER_BG = require('../../assets/images/backgrounds/welcome_bg.png');
const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

const NAV_ITEMS = [
  { label: 'Security', Icon: Shield, href: '/settings/account' },
  { label: 'Privacy', Icon: Eye, href: '/settings/privacy' },
  { label: 'Trustees', Icon: Users, href: '/settings/beneficiaries' },
  { label: '2FA', Icon: Smartphone, href: '/settings/two-factor' },
  { label: 'Billing', Icon: CreditCard, href: '/settings/billing' },
];

export default function ProfileSettingsScreen() {
  const {
    profile,
    isPending,
    handleLogout,
    openSheet,
    enrichmentScore,
    memoriesCount,
    streakCount,
    topDimension,
    router,
  } = useProfileSettingsLogic();

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
        <Animated.Text
          className="text-[28px] text-text-strong"
          style={{ fontFamily: FONTS.serif }}
        >
          Account
        </Animated.Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-24">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        {/* Profile Header Card */}
        <Animated.View entering={FadeInDown.duration(600)} className="px-6 mb-8">
          <ImageBackground
            source={HEADER_BG}
            className="w-full rounded-[32px] overflow-hidden p-7 border border-stroke-weaker bg-white"
            imageStyle={{ borderRadius: 32 }}
          >
            <View className="flex-row items-center gap-5">
              <Avatar uri={profile?.picture_url} name={profile?.fullname ?? profile?.first_name} size="xl" className="border border-stroke-weak" />
              <View className="flex-1 gap-1">
                <Animated.Text
                  className="text-[24px] text-text-strong leading-tight"
                  style={{ fontFamily: FONTS.serif }}
                >
                  {(profile?.fullname ?? `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()) || 'Your Name'}
                </Animated.Text>
                <Animated.Text
                  className="text-sm text-text-weak opacity-60"
                  style={{ fontFamily: FONTS.sansMedium }}
                  numberOfLines={1}
                >
                  {profile?.email}
                </Animated.Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4 mt-8 pt-8 border-t border-stroke-weaker/40">
              <View className="flex-1 gap-1.5 items-center">
                <Animated.Text className="text-[10px] text-text-muted font-bold uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>Enrichment</Animated.Text>
                <Animated.Text className="text-xl text-brand font-bold" style={{ fontFamily: FONTS.sansBold }}>{enrichmentScore}%</Animated.Text>
              </View>
              <View className="w-px h-10 bg-stroke-weaker" />
              <View className="flex-1 gap-1.5 items-center">
                <Animated.Text className="text-[10px] text-text-muted font-bold uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>Stories</Animated.Text>
                <Animated.Text className="text-xl text-text-strong font-bold" style={{ fontFamily: FONTS.sansBold }}>{memoriesCount}</Animated.Text>
              </View>
              <View className="w-px h-10 bg-stroke-weaker" />
              <View className="flex-1 gap-1.5 items-center">
                <Animated.Text className="text-[10px] text-text-muted font-bold uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>Streak</Animated.Text>
                <View className="flex-row items-center gap-1">
                  <Flame size={16} color={COLORS.brand} />
                  <Animated.Text className="text-xl text-text-strong font-bold" style={{ fontFamily: FONTS.sansBold }}>{streakCount}</Animated.Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* Insights Section */}
        <View className="px-6 mb-10 gap-4">
          <Animated.Text className="text-[11px] font-bold text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>Personal Insights</Animated.Text>
          <View className="flex-row gap-4">
            <View className="flex-1 bg-white rounded-[24px] border border-stroke-weaker p-5">
              <View className="flex-row items-center gap-2 mb-3">
                <Trophy size={16} color={COLORS.brand} />
                <Animated.Text className="text-xs text-text-weak font-bold" style={{ fontFamily: FONTS.sansBold }}>Enrichment Level</Animated.Text>
              </View>
              <Animated.Text className="text-3xl text-text-strong mb-2" style={{ fontFamily: FONTS.serif }}>{enrichmentScore}%</Animated.Text>
              <View className="h-2 w-full bg-fill-weak rounded-full overflow-hidden">
                <View className="h-full bg-brand" style={{ width: `${enrichmentScore}%` }} />
              </View>
            </View>
            <View className="flex-1 bg-white rounded-[24px] border border-stroke-weaker p-5">
              <View className="flex-row items-center gap-2 mb-3">
                <Zap size={16} color={COLORS.brand} />
                <Animated.Text className="text-xs text-text-weak font-bold" style={{ fontFamily: FONTS.sansBold }}>Top Focus</Animated.Text>
              </View>
              <Animated.Text className="text-[17px] text-text-strong leading-tight mb-2" style={{ fontFamily: FONTS.serif }} numberOfLines={2}>{topDimension}</Animated.Text>
              <Animated.Text className="text-[10px] text-text-muted mt-auto" style={{ fontFamily: FONTS.sansMedium }}>Based on your patterns</Animated.Text>
            </View>
          </View>
        </View>

        {/* Navigation Section */}
        <View className="px-6 gap-3">
          <Animated.Text className="text-[11px] font-bold text-text-muted uppercase tracking-[2px] px-1 mb-1" style={{ fontFamily: FONTS.sansBold }}>Settings & Privacy</Animated.Text>
          {NAV_ITEMS.map((item, idx) => (
            <Animated.View key={item.href} entering={FadeInDown.delay(100 * idx).duration(400)}>
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); router.push(item.href as any); }}
                className="flex-row items-center gap-4 bg-white rounded-[20px] px-5 py-4 border border-stroke-weaker"
                activeOpacity={0.7}
              >
                <View className="size-11 rounded-2xl bg-fill-weaker items-center justify-center">
                  <item.Icon size={20} color={COLORS.textBase} strokeWidth={1.5} />
                </View>
                <Animated.Text
                  className="flex-1 text-base text-text-strong"
                  style={{ fontFamily: FONTS.sansMedium }}
                >
                  {item.label}
                </Animated.Text>
                <ChevronRight size={18} color={COLORS.textDisabled} />
              </TouchableOpacity>
            </Animated.View>
          ))}

          {/* Feedback */}
          <Animated.View entering={FadeInDown.delay(600).duration(400)}>
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); openSheet('feedback'); }}
              className="flex-row items-center gap-4 bg-white rounded-[20px] px-5 py-4 border border-stroke-weaker"
              activeOpacity={0.7}
            >
              <View className="size-11 rounded-2xl bg-fill-weaker items-center justify-center">
                <MessageSquare size={20} color={COLORS.textBase} strokeWidth={1.5} />
              </View>
              <Animated.Text
                className="flex-1 text-base text-text-strong"
                style={{ fontFamily: FONTS.sansMedium }}
              >
                Send Feedback
              </Animated.Text>
              <ChevronRight size={18} color={COLORS.textDisabled} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Logout */}
        <View className="px-6 mt-10">
          <TouchableOpacity
            onPress={handleLogout}
            disabled={isPending}
            className="flex-row items-center justify-center gap-3 h-14 border rounded-full"
            style={{ backgroundColor: `${COLORS.error}05`, borderColor: `${COLORS.error}15` }}
          >
            <LogOut size={20} color={COLORS.error} />
            <Animated.Text className="text-base font-bold" style={{ fontFamily: FONTS.sansBold, color: COLORS.error }}>
              Sign Out
            </Animated.Text>
          </TouchableOpacity>
          <Animated.Text className="text-center text-[10px] text-text-disabled mt-6 uppercase tracking-[3px]" style={{ fontFamily: FONTS.sansBold }}>
            Memento v1.0.0
          </Animated.Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
