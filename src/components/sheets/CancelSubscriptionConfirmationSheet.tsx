import React from 'react';
import {Text, View} from 'react-native';
import {useRouter, type Href} from 'expo-router';
import * as Haptics from 'expo-haptics';
import {AlertTriangleIcon, Button} from '@/components/ui';

import {COLORS} from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

export function CancelSubscriptionConfirmationSheet({onClose}: {onClose?: () => void}) {
  const router = useRouter();
  const continueToReason = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onClose?.();
    setTimeout(() => router.push('/settings/cancel-plan' as Href), 300);
  };
  return <View style={{paddingHorizontal: 20, paddingTop: 54, paddingBottom: 20}}>
    <View style={{alignItems: 'center'}}>
      <AlertTriangleIcon size={116} />
      <Text style={{...TYPE.sectionTitle, color: COLORS.textStrong, textAlign: 'center', maxWidth: 360, marginTop: 42}}>Are you sure you want to cancel your subscription</Text>
      <Text style={{...TYPE.body, color: COLORS.textBase, textAlign: 'center', maxWidth: 350, marginTop: 18}}>If you cancel, you’ll keep full access to your plan features until the end of your billing period</Text>
    </View>
    <View style={{flexDirection: 'row', gap: 12, marginTop: 52}}>
      <Button variant="secondary" size="lg" className="flex-1" onPress={onClose}>Go back</Button>
      <Button variant="destructive" size="lg" className="flex-1" onPress={continueToReason}>Yes, Cancel</Button>
    </View>
  </View>;
}
