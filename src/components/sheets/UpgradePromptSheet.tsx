import React, { useCallback, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { SheetActions, SHEET_FILL } from './SheetActions';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { launchBillingCheckout } from '@/features/settings/billing-flow';
import { useIAP } from '@/features/billing/use-iap';
import { IAP_DISCLOSURE_COPY, IAP_LEGAL_URLS } from '@/features/billing';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';

const STREAK_FLAME = require('../../../assets/images/illustrations/streak_flame.webp');

interface UpgradePromptSheetProps {
  onClose?: () => void;
}

export function UpgradePromptSheet({ onClose }: UpgradePromptSheetProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { products, restorePurchases, restoring, purchasing } = useIAP();

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
        onClose?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const openTerms = useCallback(() => {
    void Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(IAP_LEGAL_URLS.terms);
  }, []);

  const openPrivacy = useCallback(() => {
    void Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(IAP_LEGAL_URLS.privacy);
  }, []);

  const premiumFeatures = [
    { title: 'Unlimited Time Capsules', desc: 'Free accounts can schedule up to 5 timed messages' },
    { title: 'Premium AI Memory Insights', desc: 'Deep emotional trends and summary histories' },
    { title: 'Custom AI Voices & Avatars', desc: 'Preserve your exact speaking tone and style' },
    { title: 'High-Definition Assets Storage', desc: 'Upload up to 10GB of voice, image & doc files' },
  ];

  const monthlyPrice = products.monthly.localizedPrice || '$9.99';

  return (
    <View style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
      <SheetHeader
        title="Unlock Premium Memento"
        onClose={onClose}
        closeLabel="Close upgrade prompt"
      />

      <View style={{ gap: SHEET_SECTION_GAP }}>
      <View className="items-center">
        <Image
          source={STREAK_FLAME}
          style={{ width: 72, height: 72 }}
          resizeMode="contain"
        />
      </View>

      {/* Features List */}
      <View className="bg-fill-weaker rounded-3xl border border-stroke-weaker p-5 gap-4">
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
      <View className="bg-card border border-brand/30 rounded-3xl p-5 shadow-md flex-row items-center justify-between relative overflow-hidden">
        {/* Abstract subtle accent glow */}
        <View className="absolute right-0 top-0 size-24 bg-brand/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />

        <View>
          <View className="flex-row items-center gap-1.5 mb-1">
            <Text className="text-brand uppercase tracking-wider" style={TYPE.label}>Memento Pro</Text>
          </View>
          <Text className="text-text-strong" style={TYPE.sectionTitle}>
            {monthlyPrice}<Text className="text-text-weak" style={TYPE.metadata}> / month</Text>
          </Text>
        </View>
        <View className="bg-brand/10 border border-brand/20 px-3 py-1 rounded-full">
          <Text className="text-brand" style={TYPE.eyebrow}>POPULAR</Text>
        </View>
      </View>

      </View>

      {/* Bottom Actions */}
      <SheetActions className="gap-3">
        <Button
          onPress={handleUpgrade}
          loading={loading || purchasing}
          size="lg"
          rounded="full"
          className="h-14 w-full"
        >
          Upgrade Now
        </Button>

        <Button
          onPress={restorePurchases}
          loading={restoring}
          variant="ghost"
          size="md"
          rounded="full"
          className="h-11 w-full"
          textClassName="text-text-base"
        >
          Restore Purchases
        </Button>

        <Button
          onPress={onClose}
          disabled={loading || purchasing}
          variant="ghost"
          size="md"
          rounded="full"
          className="h-11 w-full"
          textClassName="text-text-weak"
        >
          Maybe Later
        </Button>

        {/* Disclosures & Legal */}
        <View className="mt-3 pt-4 border-t border-stroke-weaker items-center">
        <Text className="text-center text-text-weak leading-relaxed" style={TYPE.metadata}>
          {IAP_DISCLOSURE_COPY}
        </Text>
        <View className="flex-row items-center justify-center gap-4 mt-3">
          <TouchableOpacity onPress={openTerms} accessibilityRole="link">
            <Text className="text-text-base underline" style={TYPE.metadata}>
              Terms of Use
            </Text>
          </TouchableOpacity>
          <Text className="text-text-weak" style={TYPE.metadata}>•</Text>
          <TouchableOpacity onPress={openPrivacy} accessibilityRole="link">
            <Text className="text-text-base underline" style={TYPE.metadata}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </SheetActions>
    </View>
  );
}
