import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Pencil from 'lucide-react-native/icons/pencil';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';
import type { BillingPaymentMethod } from '@/features/settings/billing-adapters';

const MASTERCARD_LOGO = require('../../../assets/images/icons/mastercard.png');

function MastercardMark() {
  return (
    <Image
      source={MASTERCARD_LOGO}
      style={{ width: 28, height: 18 }}
      resizeMode="contain"
      accessibilityLabel="Mastercard"
    />
  );
}

export const BillingPaymentMethodsSection = React.memo(function BillingPaymentMethodsSection({
  methods,
  onAdd,
  onEdit,
}: {
  methods: BillingPaymentMethod[];
  onAdd: () => void;
  onEdit: (id: string) => void;
}) {
  return (
    <View className="rounded-[24px] pt-1 pb-2">
      {/* Header row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <CreditCard size={iconSize(18)} color={COLORS.textStrong} strokeWidth={2} />
          <Text style={{ ...TYPE.bodyStrong, color: COLORS.textStrong }}>
            Payment methods
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add payment method"
          activeOpacity={0.75}
          onPress={() => {
            Haptics.selectionAsync();
            onAdd();
          }}
          style={{
            minHeight: minTouchTarget(36),
            minWidth: minTouchTarget(44),
            paddingHorizontal: responsiveSpace(14),
            borderRadius: radius(10),
            borderWidth: 1,
            borderColor: COLORS.strokeWeak,
            backgroundColor: COLORS.card,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...TYPE.buttonSmall, color: COLORS.textStrong }}>
            Add new
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment methods list */}
      {methods.length === 0 ? (
        <View className="mt-4 rounded-[16px] bg-fill-weaker p-4">
          <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
            No payment methods on file
          </Text>
          <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 4 }}>
            Payment methods are added securely when you upgrade or manage your plan via the Polar portal.
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-1">
          {methods.map((method) => (
            <View key={method.id} className="min-h-[58px] flex-row items-center justify-between py-2.5">
              <View className="flex-row items-center flex-1">
                <MastercardMark />
                <View className="ml-3.5">
                  <Text style={{ ...TYPE.body, color: COLORS.textStrong }} className="capitalize">
                    {method.brand}
                  </Text>
                  <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 2 }}>
                    **** {method.last4}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3">
                {method.isDefault && (
                  <View
                    style={{
                      backgroundColor: COLORS.success,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 3.5,
                    }}
                  >
                    <Text style={{ ...TYPE.metadata, color: COLORS.textInverse }}>
                      Default
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${method.brand}`}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onEdit(method.id);
                  }}
                  style={{
                    minWidth: minTouchTarget(36),
                    minHeight: minTouchTarget(36),
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 6,
                  }}
                >
                  <Pencil size={iconSize(18)} color={COLORS.textBase} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});
