import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import X from 'lucide-react-native/icons/x';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius, minTouchTarget, responsiveSpace, ms } from '@/constants/responsive';
import { launchBillingCheckout } from '@/features/settings/billing-flow';
import { useIAP } from '@/features/billing/use-iap';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { IAP_DISCLOSURE_COPY, IAP_LEGAL_URLS } from '@/features/billing';
import {
  getVoiceUpgradeCheckout,
  type VoiceUpgradePlan,
} from '@/features/chat/voice-entitlement';

const BENEFITS = [
  'Save more stories, photos, and recordings',
  'Unlock richer memory context and deeper reflection tools',
  'Access the full experience across voice and advanced features',
  'Keep building without hitting free-plan limits',
];

interface VoiceUpgradeScreenProps {
  onClose: () => void;
}

export function VoiceUpgradeScreen({ onClose }: VoiceUpgradeScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<VoiceUpgradePlan>('annual');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { products, restorePurchases, restoring, purchasing } = useIAP();
  const { isProOrAbove } = useSubscription();
  const closedForEntitlementRef = useRef(false);

  useEffect(() => {
    if (!isProOrAbove || closedForEntitlementRef.current) return;
    closedForEntitlementRef.current = true;
    onClose();
  }, [isProOrAbove, onClose]);

  const plans: Array<{
    id: VoiceUpgradePlan;
    name: string;
    price: string;
    cadence: string;
    badge?: string;
  }> = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: products.monthly.localizedPrice || '$9.99',
      cadence: '/month',
    },
    {
      id: 'annual',
      name: 'Annual',
      price: products.annual.localizedPrice || '$79.00',
      cadence: '/year',
      badge: 'Save 15%',
    },
  ];

  const handleSelectPlan = useCallback((plan: VoiceUpgradePlan) => {
    void Haptics.selectionAsync();
    setSelectedPlan(plan);
  }, []);

  const handleUpgrade = useCallback(async () => {
    const checkout = getVoiceUpgradeCheckout(selectedPlan);
    setLoading(true);
    try {
      const opened = await launchBillingCheckout({
        ...checkout,
        returnPath: '/(tabs)/chat',
        queryClient,
      });
      if (opened) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }, [onClose, queryClient, selectedPlan]);

  const handleRestore = useCallback(async () => {
    const restored = await restorePurchases();
    if (restored) {
      onClose();
    }
  }, [onClose, restorePurchases]);

  const openTerms = useCallback(() => {
    void Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(IAP_LEGAL_URLS.terms);
  }, []);

  const openPrivacy = useCallback(() => {
    void Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(IAP_LEGAL_URLS.privacy);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          accessibilityLabel="Close upgrade screen"
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={onClose}
          style={styles.closeButton}
        >
          <X size={iconSize(20)} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headingBlock}>
          <Text style={styles.title}>Voice mode is a Pro feature</Text>
          <Text style={styles.subtitle}>
            Upgrade to talk with Memento hands-free. Pro includes unlimited voice conversations.
          </Text>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <View style={styles.benefitDot} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {plans.map((plan) => {
            const selected = plan.id === selectedPlan;
            return (
              <TouchableOpacity
                key={plan.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                activeOpacity={0.78}
                onPress={() => handleSelectPlan(plan.id)}
                style={[styles.planCard, selected && styles.planCardSelected]}
              >
                <View style={styles.planHeading}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {plan.badge && (
                    <View style={[styles.badge, plan.id === 'annual' && styles.badgeSelected]}>
                      <Text style={[styles.badgeText, plan.id === 'annual' && styles.badgeTextSelected]}>
                        {plan.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.cadence}>{plan.cadence}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button
            fullWidth
            loading={loading || purchasing}
            onPress={() => { void handleUpgrade(); }}
            className="h-14"
          >
            Upgrade to Pro
          </Button>

          <Button
            fullWidth
            variant="ghost"
            loading={restoring}
            onPress={() => { void handleRestore(); }}
            className="h-11"
            textClassName="text-text-base"
          >
            Restore Purchases
          </Button>

          <Button
            fullWidth
            disabled={loading || purchasing}
            onPress={onClose}
            variant="outline"
            className="h-14 bg-card"
          >
            Let me think about it
          </Button>
        </View>

        {/* Legal disclosures & links */}
        <View style={styles.legalSection}>
          <Text style={styles.disclosureText}>
            {IAP_DISCLOSURE_COPY}
          </Text>
          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={openTerms} accessibilityRole="link" hitSlop={8}>
              <Text style={styles.legalLink}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>•</Text>
            <TouchableOpacity onPress={openPrivacy} accessibilityRole="link" hitSlop={8}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 28, paddingHorizontal: 20, paddingTop: 20 },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: COLORS.card,
    borderColor: COLORS.strokeWeak,
    borderRadius: radius(22),
    borderWidth: 1,
    height: minTouchTarget(44),
    justifyContent: 'center',
    width: minTouchTarget(44),
  },
  headingBlock: { marginTop: 10, paddingRight: 28 },
  title: {
    color: COLORS.textStrong,
    ...TYPE.displayTitle,
  },
  subtitle: {
    color: COLORS.textBase,
    ...TYPE.body,
    marginTop: 12,
  },
  benefits: { gap: 12, marginTop: 24 },
  benefitRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  benefitDot: {
    backgroundColor: COLORS.textStrong,
    borderRadius: radius(5),
    height: 10,
    marginTop: 7,
    width: 10,
  },
  benefitText: {
    color: COLORS.textStrong,
    flex: 1,
    ...TYPE.body,
  },
  plans: { gap: 12, marginTop: 24 },
  planCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.strokeWeak,
    borderRadius: radius(22),
    borderWidth: 1,
    paddingHorizontal: responsiveSpace(16),
    paddingVertical: responsiveSpace(16),
  },
  planCardSelected: {
    backgroundColor: COLORS.fillWeaker,
    borderColor: COLORS.textStrong,
  },
  planHeading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  planName: {
    color: COLORS.textStrong,
    ...TYPE.label,
  },
  badge: {
    backgroundColor: COLORS.fillWeak,
    borderRadius: radius(12),
    paddingHorizontal: responsiveSpace(8),
    paddingVertical: responsiveSpace(4),
  },
  badgeSelected: { backgroundColor: COLORS.textStrong },
  badgeText: {
    color: COLORS.textStrong,
    ...TYPE.metadata,
  },
  badgeTextSelected: { color: COLORS.textInverse },
  priceRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 4, marginTop: 12 },
  price: {
    color: COLORS.textStrong,
    ...TYPE.screenTitle,
  },
  cadence: {
    color: COLORS.textBase,
    ...TYPE.label,
  },
  actions: { gap: 12, marginTop: 24 },
  legalSection: {
    alignItems: 'center',
    borderTopColor: COLORS.strokeWeaker,
    borderTopWidth: 1,
    marginTop: 24,
    paddingTop: 16,
  },
  disclosureText: {
    color: COLORS.textWeak,
    ...TYPE.metadata,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalLinksRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 12,
  },
  legalLink: {
    color: COLORS.textBase,
    ...TYPE.metadata,
    textDecorationLine: 'underline',
  },
  legalDot: {
    color: COLORS.textWeak,
    ...TYPE.metadata,
  },
});
