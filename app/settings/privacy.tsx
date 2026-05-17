import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, StyleSheet, Platform } from 'react-native';
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
    desc: 'Manage your data and storage usage across your devices.',
    Icon: Database 
  },
  { 
    title: 'Memory Visibility', 
    desc: 'Control who can see your memories by default.',
    Icon: Eye 
  },
  { 
    title: 'AI Personalization', 
    desc: 'Allow your companion to learn from your reflections.',
    Icon: Brain 
  },
  { 
    title: 'Export Data', 
    desc: 'Download a complete archive of all your content.',
    Icon: Download 
  },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();

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
          Privacy
        </Animated.Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-12">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        <View className="px-6 gap-4">
          <Animated.Text className="text-[11px] font-bold text-text-muted uppercase tracking-[2px] px-1 mb-1" style={{ fontFamily: FONTS.sansBold }}>Security & Control</Animated.Text>
          
          {PRIVACY_ITEMS.map((item, idx) => (
            <Animated.View key={item.title} entering={FadeInDown.delay(100 * idx).duration(500)} style={styles.cardShadow}>
              <TouchableOpacity
                onPress={() => Haptics.selectionAsync()}
                activeOpacity={0.7}
                className="flex-row items-center gap-4 bg-white rounded-[24px] p-5 border border-stroke-weaker"
              >
                <View className="size-12 rounded-2xl bg-fill-weaker items-center justify-center">
                  <item.Icon size={22} color={COLORS.textBase} strokeWidth={1.5} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Animated.Text
                    className="text-base text-text-strong"
                    style={{ fontFamily: FONTS.sansMedium }}
                  >
                    {item.title}
                  </Animated.Text>
                  <Animated.Text
                    className="text-xs text-text-weak leading-relaxed"
                    style={{ fontFamily: FONTS.sans }}
                  >
                    {item.desc}
                  </Animated.Text>
                </View>
                <ChevronRight size={18} color={COLORS.textDisabled} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View className="px-10 mt-12">
          <Animated.Text className="text-center text-[10px] text-text-disabled leading-relaxed uppercase tracking-[2px]" style={{ fontFamily: FONTS.sansBold }}>
            Your data is encrypted end-to-end. Memento cannot read your reflections without your explicit permission.
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
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
