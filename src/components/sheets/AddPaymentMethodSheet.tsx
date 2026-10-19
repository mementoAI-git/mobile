import { useThemeColors } from '@/hooks/use-theme-colors';
import React, {useCallback, useState} from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import CreditCard from 'lucide-react-native/icons/credit-card';
import X from 'lucide-react-native/icons/x';
import Svg, {Path} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button} from '@/components/ui';

import {COLORS} from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {openBillingPortal} from '@/features/settings/billing-flow';
import {getSheetBottomPadding} from '@/features/layout/sheet-safe-area';

function PayPalIcon() {
  const COLORS = useThemeColors();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.79.79 0 0 1 .78-.663h6.744c2.81 0 4.887.65 6.002 1.88 1.077 1.188 1.34 2.87.763 4.878-.85 2.96-3.13 4.634-6.61 4.634H9.68a.79.79 0 0 0-.78.663l-1.824 6.225z"
        fill={COLORS.blue7}
      />
      <Path
        d="M9.68 14.449h2.943c3.48 0 5.76-1.674 6.61-4.634.577-2.008.314-3.69-.763-4.878-.363-.4-.82-.71-1.36-.937a7.712 7.712 0 0 1 2.22 1.51c1.077 1.188 1.34 2.87.763 4.878-.85 2.96-3.13 4.634-6.61 4.634H10.54a.79.79 0 0 0-.78.663l-1.464 4.998-.12.423a.64.64 0 0 1 .632-.74l.872-2.917z"
        fill={COLORS.info}
      />
    </Svg>
  );
}

function VisaBadge() {
  const COLORS = useThemeColors();
  return (
    <View style={{borderWidth: 1, borderColor: COLORS.strokeWeak, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: COLORS.card}}>
      <Text style={{...TYPE.eyebrow, color: COLORS.info}}>VISA</Text>
    </View>
  );
}

function PaymentCardPlaceholder() {
  const COLORS = useThemeColors();
  return (
    <View style={{width: 140, height: 90, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.strokeWeak}}>
      <View style={{height: 22, backgroundColor: COLORS.fillWeak}}/>
      <View style={{position: 'absolute', right: 12, bottom: 12, width: 38, height: 16, borderRadius: 8, backgroundColor: COLORS.strokeStrong, opacity: 0.2}}/>
    </View>
  );
}

function MockInputField({
  label,
  value,
  placeholder,
  rightElement,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}) {
  const COLORS = useThemeColors();
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={{gap: 6, flex: 1}}
    >
      <Text style={{...TYPE.label, color: COLORS.textStrong}}>{label}</Text>
      <View
        style={{
          height: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.strokeWeak,
          backgroundColor: COLORS.card,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            ...TYPE.input,
            color: value ? COLORS.textStrong : COLORS.textWeak,
          }}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {rightElement}
      </View>
    </TouchableOpacity>
  );
}

export function AddPaymentMethodSheet({
  onClose,
  expandSheet,
  canManage = true,
  onUpgrade,
}: {
  onClose: () => void;
  expandSheet?: () => void;
  canManage?: boolean;
  onUpgrade?: () => void;
}) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'paypal'>('card');

  const continueSecurely = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canManage) {
      onClose();
      onUpgrade?.();
      return;
    }
    setBusy(true);
    try {
      const opened = await openBillingPortal({returnPath: '/settings/billing'});
      if (opened) onClose();
    } finally {
      setBusy(false);
    }
  }, [canManage, onClose, onUpgrade]);

  return (
    <View style={{flex: 1}}>
      <View style={{minHeight: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <Text style={{...TYPE.sectionTitle, color: COLORS.textStrong}}>Add Payment Method</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Close payment method"
          onPress={() => {
            Haptics.selectionAsync();
            onClose();
          }}
          style={{width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fillWeak}}
        >
          <X size={18} color={COLORS.textStrong}/>
        </TouchableOpacity>
      </View>
      <BottomSheetScrollView
        style={{flex: 1}}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={expandSheet}
        contentContainerStyle={{paddingHorizontal: 20, paddingTop: 4, paddingBottom: 64, gap: 16}}
      >
        <View style={{height: 140, borderRadius: 16, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center'}}>
          <PaymentCardPlaceholder/>
        </View>

        <View style={{gap: 6}}>
          <Text style={{...TYPE.label, color: COLORS.textStrong}}>Payment Method</Text>
          <View style={{flexDirection: 'row', gap: 12}}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedMethod('card')}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selectedMethod === 'card' ? COLORS.brand : COLORS.strokeWeak,
                backgroundColor: selectedMethod === 'card' ? COLORS.brandSubtle : COLORS.card,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                gap: 10,
              }}
            >
              <CreditCard size={18} color={COLORS.textStrong}/>
              <Text style={{...TYPE.label, color: COLORS.textStrong}}>Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedMethod('paypal')}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selectedMethod === 'paypal' ? COLORS.brand : COLORS.strokeWeak,
                backgroundColor: selectedMethod === 'paypal' ? COLORS.brandSubtle : COLORS.card,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                gap: 10,
              }}
            >
              <PayPalIcon/>
              <Text style={{...TYPE.label, color: COLORS.textStrong}}>PayPal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <MockInputField
          label="Card number"
          placeholder="•••• •••• •••• ••••"
          rightElement={<VisaBadge/>}
        />

        <View style={{flexDirection: 'row', gap: 12}}>
          <MockInputField
            label="Expiration date"
            placeholder="MM/YY"
          />
          <MockInputField
            label="Security code"
            placeholder="CCV"
          />
        </View>

        <MockInputField
          label="Full name"
          placeholder="Name on card"
        />

        <View style={{flexDirection: 'row', gap: 12}}>
          <MockInputField
            label="Country or region"
            placeholder="Select country"
            rightElement={<ChevronDown size={18} color={COLORS.textBase}/>}
          />
          <MockInputField
            label="ZIP code"
            placeholder="Postal code"
          />
        </View>
      </BottomSheetScrollView>

      <View style={{flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(getSheetBottomPadding(insets.bottom, 12), 16), backgroundColor: COLORS.background}}>
        <Button variant="secondary" size="lg" className="h-14 flex-1" onPress={onClose}>Dismiss</Button>
        <Button size="lg" className="h-14 flex-1 bg-media-surface text-white" loading={busy} onPress={() => void continueSecurely()}>
          {canManage ? 'Continue to Portal' : 'Upgrade to Pro'}
        </Button>
      </View>
    </View>
  );
}
