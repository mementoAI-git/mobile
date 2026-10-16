import React, { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';

const STREAK_FLAME = require('../../../assets/images/illustrations/streak_flame.webp');

interface UpgradeSuccessSheetProps {
  onClose?: () => void;
}

const UNLOCKED_PERKS = [
  {
    title: 'Unlimited Time Capsules',
    desc: 'Send messages across years and decades without limits.',
  },
  {
    title: '10 GB Vault Storage',
    desc: 'Store original-resolution photographs, documents, and voice journals.',
  },
  {
    title: 'Custom AI Voice & Tone',
    desc: 'Calibrate your companion to speak in your exact cadence and style.',
  },
  {
    title: 'Deep Emotional Insights',
    desc: 'Discover life themes, sentiment trends, and reflective breakthroughs.',
  },
];

export function UpgradeSuccessSheet({ onClose }: UpgradeSuccessSheetProps) {
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleDismiss = () => {
    void Haptics.selectionAsync();
    onClose?.();
  };

  return (
    <View className="flex-grow px-5 pb-8 pt-2">
      {/* Top Bar with 44x44 Close Button */}
      <View className="flex-row items-center justify-end mb-2">
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close upgrade celebration"
          className="size-11 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      {/* Hero Illustration */}
      <View className="items-center justify-center pt-1 pb-6">
        <Image
          source={STREAK_FLAME}
          style={{ width: 88, height: 88, marginBottom: 16 }}
          resizeMode="contain"
        />

        <Text
          className="text-center text-text-strong mb-2.5"
          style={TYPE.sectionTitle}
        >
          Welcome to Memento Pro
        </Text>
        <Text
          className="text-center text-text-weak px-4 leading-relaxed"
          style={TYPE.body}
        >
          Your personal archive is fully unlocked. Every chapter, voice memory, and future capsule is permanently preserved.
        </Text>
      </View>

      {/* Perks List */}
      <View className="bg-fill-weaker rounded-3xl border border-stroke-weaker p-5 gap-4 mb-8">
        {UNLOCKED_PERKS.map((perk, index) => (
          <View key={index} className="flex-row items-start gap-3.5">
            <View className="size-2 rounded-full bg-brand mt-2" />
            <View className="flex-1">
              <Text className="text-text-strong" style={TYPE.label}>
                {perk.title}
              </Text>
              <Text className="text-text-weak mt-0.5" style={TYPE.metadata}>
                {perk.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Primary CTA */}
      <Button
        variant="primary"
        size="lg"
        className="h-14 w-full"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onClose?.();
        }}
      >
        Explore Your Vault
      </Button>
    </View>
  );
}
