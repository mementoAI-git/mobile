import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { launchBillingCheckout } from '@/features/settings/billing-flow';

const STREAK_FLAME = require('../../../assets/images/illustrations/streak_flame.webp');

interface UpgradePromptSheetProps {
  onClose?: () => void;
}

export function UpgradePromptSheet({ onClose }: UpgradePromptSheetProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleUpgrade = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      const opened = await launchBillingCheckout({
        tier: 'pro',
        interval: 'monthly',
        returnPath: '/(tabs)/overview',
        queryClient,
      });

      if (opened) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setLoading(false);
      onClose?.();
    }
  };

  const premiumFeatures = [
    { title: 'Unlimited Time Capsules', desc: 'Free accounts can schedule up to 5 timed messages' },
    { title: 'Premium AI Memory Insights', desc: 'Deep emotional trends and summary histories' },
    { title: 'Custom AI Voices & Avatars', desc: 'Preserve your exact speaking tone and style' },
    { title: 'High-Definition Assets Storage', desc: 'Upload up to 10GB of voice, image & doc files' },
  ];

  return (
    <View className="flex-grow px-4 pb-6">
      {/* Hero Illustration */}
      <View className="items-center justify-center pt-2 pb-6 relative">
        <Image
          source={STREAK_FLAME}
          style={{ width: 84, height: 84, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text
          className="text-center text-text-strong mb-2"
          style={TYPE.sectionTitle}>
          Unlock Premium Memento
        </Text>
        <Text
          className="text-center text-text-weak px-4 leading-relaxed"
          style={TYPE.label}>
          You have reached the free tier limit of 5 time capsules. Upgrade to Pro to preserve more future memories.
        </Text>
      </View>

      {/* Features List */}
      <View className="bg-fill-weaker rounded-3xl border border-stroke-weaker p-5 gap-4 mb-8">
        {premiumFeatures.map((f, i) => (
          <View key={i} className="flex-row items-start gap-3">
            <View className="size-2 rounded-full bg-brand mt-2" />
            <View className="flex-1">
              <Text className="text-text-strong" style={TYPE.label}>
                {f.title}
              </Text>
              <Text className="text-text-weak mt-0.5" style={TYPE.metadata}>
                {f.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Subscription Pricing Option */}
      <View className="bg-white border border-brand/30 rounded-3xl p-5 shadow-md flex-row items-center justify-between mb-8 relative overflow-hidden">
        {/* Abstract subtle accent glow */}
        <View className="absolute right-0 top-0 size-24 bg-brand/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />

        <View>
          <View className="flex-row items-center gap-1.5 mb-1">
            <Text className="text-brand uppercase tracking-wider" style={TYPE.label}>Memento Pro</Text>
          </View>
          <Text className="text-text-strong" style={TYPE.sectionTitle}>
            $9.99<Text className="text-text-weak" style={TYPE.metadata}> / month</Text>
          </Text>
        </View>
        <View className="bg-brand/10 border border-brand/20 px-3 py-1 rounded-full">
          <Text className="text-brand" style={TYPE.eyebrow}>POPULAR</Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View className="gap-3">
        <Button
          onPress={handleUpgrade}
          loading={loading}
          size="lg"
          className="h-14 w-full"
        >
          Upgrade Now
        </Button>

        <TouchableOpacity
          onPress={onClose}
          disabled={loading}
          activeOpacity={0.7}
          className="h-12 items-center justify-center"
        >
          <Text className="text-text-weak" style={TYPE.label}>
            Maybe Later
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
