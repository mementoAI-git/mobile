import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import { getThemeById } from '@/constants/themes';

const EMPTY_CAPSULES_IMG = require('../../../assets/images/illustrations/empty_capsules.webp');

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

          {/* Stamped Wax Seal with Capsule Illustration */}
          <View className="items-center gap-2">
            <Image
              source={EMPTY_CAPSULES_IMG}
              style={{ width: 72, height: 72 }}
              resizeMode="contain"
            />
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
        <View className="flex-row items-center justify-between">
          <Text className="text-text-muted uppercase tracking-wider" style={TYPE.metadata}>
            Scheduled Unlock Date
          </Text>
          <Text className="text-text-strong" style={TYPE.label}>
            {formattedDate}
          </Text>
        </View>

        <View className="h-px bg-stroke-weaker" />

        <View className="flex-row items-center justify-between">
          <Text className="text-text-muted uppercase tracking-wider" style={TYPE.metadata}>
            Designated Recipients
          </Text>
          <Text className="text-text-strong" style={TYPE.label} numberOfLines={1}>
            {recipientsText}
          </Text>
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
