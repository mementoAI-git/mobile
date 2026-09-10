import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, Crown, CheckCircle2, Zap } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { launchBillingCheckout } from '@/features/settings/billing-flow';

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
        returnPath: '/(tabs)/capsule',
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
    { title: 'Unlimited Time Capsules', desc: 'Free accounts are capped at a maximum of 5' },
    { title: 'Premium AI Memory Insights', desc: 'Deep emotional trends and summary histories' },
    { title: 'Custom AI Voices & Avatars', desc: 'Preserve your exact speaking tone and style' },
    { title: 'High-Definition Assets Storage', desc: 'Upload up to 50GB of voice, image & doc files' },
  ];

  return (
    <View className="flex-grow px-4 pb-6">
      {/* Crown Banner */}
      <View className="items-center justify-center pt-2 pb-6 relative">
        <View className="size-16 rounded-3xl bg-brand/10 border border-brand/20 items-center justify-center shadow-sm mb-4">
          <Crown size={32} color={COLORS.brand} strokeWidth={2} />
        </View>
        <Text 
          className="text-2xl text-center text-text-strong font-semibold mb-2" 
          style={{ fontFamily: FONTS.serif }}
        >
          Unlock Premium Memento
        </Text>
        <Text 
          className="text-sm text-center text-text-weak px-4 leading-relaxed" 
          style={{ fontFamily: FONTS.sans }}
        >
          You have reached the free tier limit of **5 Time Capsules**. Upgrade to Pro to preserve infinite future memories.
        </Text>
      </View>

      {/* Features List */}
      <View className="bg-fill-weaker rounded-3xl border border-stroke-weaker p-5 gap-4 mb-8">
        {premiumFeatures.map((f, i) => (
          <View key={i} className="flex-row gap-3">
            <View className="pt-0.5">
              <CheckCircle2 size={18} color={COLORS.brand} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>
                {f.title}
              </Text>
              <Text className="text-xs text-text-weak mt-0.5" style={{ fontFamily: FONTS.sans }}>
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
            <Text className="text-sm font-bold text-brand uppercase tracking-wider" style={{ fontFamily: FONTS.sansBold }}>Memento Pro</Text>
            <Sparkles size={12} color={COLORS.brand} />
          </View>
          <Text className="text-2xl font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>
            $9.99<Text className="text-xs text-text-weak font-normal" style={{ fontFamily: FONTS.sans }}> / month</Text>
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
          leftIcon={<Zap size={18} color={COLORS.textInverse} />}
        >
          Upgrade Now
        </Button>

        <TouchableOpacity
          onPress={onClose}
          disabled={loading}
          activeOpacity={0.7}
          className="h-12 items-center justify-center"
        >
          <Text className="text-sm text-text-weak font-semibold" style={{ fontFamily: FONTS.sansMedium }}>
            Maybe Later
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
