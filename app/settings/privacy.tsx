import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Brain } from 'lucide-react-native';
import { UiDatabase01, UiEye, UiDownloadCloud01, UiLock01 } from '@/components/ui/icons/SettingsIcons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { useRouter } from 'expo-router';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

const PRIVACY_ITEMS = [
  {
    title: 'Data & Storage',
    desc: 'View how much space you use and manage stored files.',
    Icon: UiDatabase01,
    iconBg: `${COLORS.info}14`,
    iconColor: COLORS.info,
    status: 'active' as const,
  },
  {
    title: 'Memory Visibility',
    desc: 'Set a default audience for new memories — private, trustees, or specific people.',
    Icon: UiEye,
    iconBg: `${COLORS.brand}12`,
    iconColor: COLORS.brand,
    status: 'active' as const,
  },
  {
    title: 'AI Personalization',
    desc: 'Let your companion learn from reflections to give you richer, more personal responses.',
    Icon: Brain,
    iconBg: `${COLORS.success}12`,
    iconColor: COLORS.success,
    status: 'active' as const,
  },
  {
    title: 'Export Data',
    desc: 'Download a complete archive of all your memories, capsules and account data.',
    Icon: UiDownloadCloud01,
    iconBg: `${COLORS.warning}12`,
    iconColor: COLORS.warning,
    status: 'coming_soon' as const,
  },
];

// ─── Individual card row ──────────────────────────────────────────────────────

function PrivacyCard({
  title, desc, Icon, iconBg, iconColor, status, entering,
}: {
  title: string;
  desc: string;
  Icon: any;
  iconBg: string;
  iconColor: string;
  status: 'active' | 'coming_soon';
  entering: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isComingSoon = status === 'coming_soon';

  return (
    <Animated.View entering={entering} style={animStyle}>
      <TouchableOpacity
        onPress={() => {
          if (!isComingSoon) Haptics.selectionAsync();
        }}
        onPressIn={() => { if (!isComingSoon) scale.value = withSpring(0.98, { damping: 20, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 300 }); }}
        activeOpacity={isComingSoon ? 1 : 0.95}
        style={{ opacity: isComingSoon ? 0.6 : 1 }}
      >
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 24,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          {/* Icon badge */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: iconBg,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={22} color={iconColor} strokeWidth={1.5} />
          </View>

          {/* Text */}
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 15, color: COLORS.textStrong }}>
                {title}
              </Text>
              {isComingSoon && (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: COLORS.fillWeak,
                    borderWidth: 1,
                    borderColor: COLORS.strokeWeaker,
                  }}
                >
                  <Text style={{ fontFamily: FONTS.sansBold, fontSize: 9, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Soon
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textWeak, lineHeight: 19 }}>
              {desc}
            </Text>
          </View>

          {/* Chevron */}
          {!isComingSoon && (
            <ChevronRight size={16} color={COLORS.textMuted} strokeWidth={2} style={{ marginTop: 4, flexShrink: 0 }} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrivacySettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 16 }}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) { router.back(); } else { router.replace('/settings'); } }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.fillWeaker, borderWidth: 1, borderColor: COLORS.strokeWeaker, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.serif, fontSize: 28, color: COLORS.textStrong, lineHeight: 34 }}>
            Privacy
          </Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textWeak, marginTop: 1 }}>
            You decide what's shared and with whom
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}>
        <ImageBackground source={PATTERN} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} imageStyle={{ opacity: 0.03 }} resizeMode="repeat" />

        {/* Intro line */}
        <Animated.Text
          entering={FadeInDown.duration(400)}
          style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, lineHeight: 20, paddingTop: 4, paddingBottom: 8, paddingHorizontal: 4 }}
        >
          Fine-tune how your memories and data are handled across Memento.
        </Animated.Text>

        {/* Individual cards */}
        {PRIVACY_ITEMS.map((item, idx) => (
          <PrivacyCard
            key={item.title}
            {...item}
            entering={FadeInDown.delay(80 * idx).duration(450)}
          />
        ))}

        {/* Promise card */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(450)}
          style={{
          backgroundColor: COLORS.card,
          borderRadius: 24,
          padding: 20,
          flexDirection: 'row',
          gap: 14,
          alignItems: 'flex-start',
          marginTop: 4,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: `${COLORS.success}14`,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UiLock01 size={16} color={COLORS.success} strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 13, color: COLORS.textStrong }}>
              Private by default
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textWeak, lineHeight: 19 }}>
              Your reflections stay visible only to you unless you choose who can receive or view them.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
