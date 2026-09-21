import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Lock, Calendar, Users, X, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import { getThemeById } from '@/constants/themes';

interface CapsuleSealedSheetProps {
  title?: string;
  unlockDate?: string;
  recipientNames?: string[];
  themeId?: string;
  onClose?: () => void;
}

export function CapsuleSealedSheet({
  title = 'Untitled Capsule',
  unlockDate,
  recipientNames = [],
  themeId = 'classic',
  onClose,
}: CapsuleSealedSheetProps) {
  useEffect(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const theme = getThemeById(themeId);
  const Background = theme.Background;
  const formattedDate = unlockDate
    ? dayjs(unlockDate).format('MMMM D, YYYY')
    : 'Future date';

  const recipientsText = recipientNames.length > 0
    ? recipientNames.join(', ')
    : 'Your future self';

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
          accessibilityLabel="Close sealed ceremony"
          className="size-11 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      {/* Themed Sealed Envelope Card */}
      <View className="items-center mb-6">
        <View
          className="w-full h-48 rounded-3xl overflow-hidden border border-stroke-weaker relative items-center justify-center shadow-sm"
          style={{ backgroundColor: theme.color }}
        >
          <Background />

          {/* Stamped Wax Seal */}
          <View className="items-center gap-2">
            <View className="size-16 rounded-full bg-brand/20 border-2 border-brand items-center justify-center shadow-md">
              <Lock size={26} color={COLORS.brand} strokeWidth={2.2} />
            </View>
            <View className="bg-black/40 rounded-full px-3 py-1">
              <Text className="text-white tracking-widest uppercase" style={TYPE.metadata}>
                Sealed & Encrypted
              </Text>
            </View>
            <Text
              className="text-center px-6 mt-1"
              style={{ ...TYPE.cardTitle, color: theme.textColor }}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        </View>
      </View>

      {/* Editorial Title */}
      <View className="items-center mb-5">
        <Text className="text-center text-text-strong mb-1.5" style={TYPE.sectionTitle}>
          Sealed in the Vault
        </Text>
        <Text className="text-center text-text-weak px-4" style={TYPE.body}>
          Your message is safely locked and will be delivered exactly on schedule.
        </Text>
      </View>

      {/* Delivery Commitment Details */}
      <View className="bg-fill-weaker rounded-2xl border border-stroke-weaker p-4 gap-3.5 mb-7">
        <View className="flex-row items-center gap-3">
          <View className="size-8 rounded-full bg-brand/10 items-center justify-center">
            <Calendar size={16} color={COLORS.brand} />
          </View>
          <View className="flex-1">
            <Text className="text-text-muted uppercase tracking-wider" style={TYPE.metadata}>
              Scheduled Unlock Date
            </Text>
            <Text className="text-text-strong mt-0.5" style={TYPE.label}>
              {formattedDate}
            </Text>
          </View>
        </View>

        <View className="h-px bg-stroke-weaker" />

        <View className="flex-row items-center gap-3">
          <View className="size-8 rounded-full bg-brand/10 items-center justify-center">
            <Users size={16} color={COLORS.brand} />
          </View>
          <View className="flex-1">
            <Text className="text-text-muted uppercase tracking-wider" style={TYPE.metadata}>
              Designated Recipients
            </Text>
            <Text className="text-text-strong mt-0.5" style={TYPE.label} numberOfLines={1}>
              {recipientsText}
            </Text>
          </View>
        </View>
      </View>

      {/* Primary Action Button */}
      <Button
        variant="primary"
        size="lg"
        className="h-14 w-full"
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onClose?.();
        }}
      >
        Done
      </Button>
    </View>
  );
}
