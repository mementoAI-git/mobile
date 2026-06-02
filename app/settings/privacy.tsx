import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Text} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Database, Eye, Brain, Download, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { useRouter } from 'expo-router';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

const PRIVACY_ITEMS = [
  {
    title: 'Data & Storage',
    desc: 'Manage your data and storage usage.',
    Icon: Database,
    iconBg: COLORS.fillWeak,
  },
  {
    title: 'Memory Visibility',
    desc: 'Control who can see your memories by default.',
    Icon: Eye,
    iconBg: COLORS.fillWeak,
  },
  {
    title: 'AI Personalization',
    desc: 'Allow your companion to learn from your reflections.',
    Icon: Brain,
    iconBg: COLORS.fillWeak,
  },
  {
    title: 'Export Data',
    desc: 'Download a complete archive of all your content.',
    Icon: Download,
    iconBg: COLORS.fillWeak,
  },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();

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
        <Text className="text-[28px] text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Privacy
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-6 pb-16 gap-6">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        <View className="gap-3">
          <Text className="text-[11px] text-text-muted uppercase tracking-[2px] px-1" style={{ fontFamily: FONTS.sansBold }}>
            Controls
          </Text>

          {PRIVACY_ITEMS.map((item, idx) => (
            <Animated.View key={item.title} entering={FadeInDown.delay(60 * idx).duration(400)}>
              <TouchableOpacity
                onPress={() => Haptics.selectionAsync()}
                activeOpacity={0.7}
                className="flex-row items-center gap-4 px-5 py-4 bg-white rounded-[20px] border border-stroke-weaker"
              >
                <View className="size-11 rounded-2xl items-center justify-center" style={{ backgroundColor: item.iconBg }}>
                  <item.Icon size={20} color={COLORS.textBase} strokeWidth={1.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>
                    {item.title}
                  </Text>
                  <Text className="text-xs text-text-weak leading-relaxed mt-0.5" style={{ fontFamily: FONTS.sans }}>
                    {item.desc}
                  </Text>
                </View>
                <ChevronRight size={18} color={COLORS.textDisabled} strokeWidth={1.5} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View className="px-2">
          <Text className="text-center text-[10px] text-text-disabled leading-relaxed uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
            Your data is encrypted end-to-end. Memento cannot read your reflections without your explicit permission.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
