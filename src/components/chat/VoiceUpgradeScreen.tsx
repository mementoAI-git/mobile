import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { launchBillingCheckout } from '@/features/settings/billing-flow';
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

const PLANS: Array<{
  id: VoiceUpgradePlan;
  name: string;
  price: string;
  cadence: string;
  badge?: string;
}> = [
  { id: 'monthly', name: 'Monthly', price: '$9.99', cadence: '/month' },
  { id: 'annual', name: 'Annual', price: '$79.00', cadence: '/year', badge: 'Save 15%' },
  { id: 'lifetime', name: 'Lifetime', price: '$999.00', cadence: 'once', badge: 'Best value' },
];

interface VoiceUpgradeScreenProps {
  onClose: () => void;
}

export function VoiceUpgradeScreen({ onClose }: VoiceUpgradeScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<VoiceUpgradePlan>('annual');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

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
      }
    } finally {
      setLoading(false);
    }
  }, [queryClient, selectedPlan]);

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
          <X size={20} color={COLORS.textBase} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headingBlock}>
          <Text style={styles.title}>Voice mode is a Pro feature</Text>
          <Text style={styles.subtitle}>
            Upgrade to talk with Memento hands-free. Pro and Legacy include voice conversations.
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
          {PLANS.map((plan) => {
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
            loading={loading}
            onPress={() => { void handleUpgrade(); }}
            className="h-14"
                      >
            Upgrade to Pro
          </Button>
          <Button
            fullWidth
            disabled={loading}
            onPress={onClose}
            variant="outline"
            className="h-14 bg-card"
                      >
            Let me think about it
          </Button>
        </View>

        <Text style={styles.footer}>
          Terms of Service &amp; Privacy Policy | Have a question? Contact us
        </Text>
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
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
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
    borderRadius: 5,
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
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  footer: {
    color: COLORS.textBase,
    ...TYPE.bodySmall,
    marginTop: 20,
    textAlign: 'center',
  },
});
