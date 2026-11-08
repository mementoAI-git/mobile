import React from 'react';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Check from 'lucide-react-native/icons/check';
import { Button } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { PRO_FEATURES } from '@/features/billing/plan-state';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { CelebrationSheet, CelebrationSheetCard } from './CelebrationSheet';

const STREAK_FLAME = require('../../../assets/images/illustrations/streak_flame.webp');

/** What Pro adds, from the plans page catalog (web `plan-catalog.ts`). */
const UNLOCKED = PRO_FEATURES.filter((feature) => feature !== 'Everything in Free');

interface UpgradeSuccessSheetProps {
  onClose?: () => void;
}

/** Shown once a Pro purchase is confirmed (store purchase or web checkout return). */
export function UpgradeSuccessSheet({ onClose }: UpgradeSuccessSheetProps) {
  const colors = useThemeColors();
  return (
    <CelebrationSheet
      image={STREAK_FLAME}
      title="Welcome to Memento Pro"
      description="Your archive is fully unlocked. Here’s what’s new for you."
      closeLabel="Close"
      onClose={onClose}
      actions={
        <Button
          variant="primary"
          className="h-14 w-full"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onClose?.();
          }}
        >
          Continue
        </Button>
      }
    >
      <CelebrationSheetCard>
        {UNLOCKED.map((feature) => (
          <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.brandTint,
              }}
            >
              <Check size={14} color={colors.brand} strokeWidth={2.4} />
            </View>
            <Text style={[TYPE.label, { color: colors.textStrong, flex: 1 }]}>{feature}</Text>
          </View>
        ))}
      </CelebrationSheetCard>
    </CelebrationSheet>
  );
}
