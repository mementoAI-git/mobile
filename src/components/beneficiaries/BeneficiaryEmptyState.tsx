import React from 'react';
import { Text, View, Image } from 'react-native';
import { Button } from '@/components/ui';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { hs, radius } from '@/constants/responsive';

const EMPTY_IMG = require('../../../assets/images/illustrations/empty_memories.webp');

export function BeneficiaryEmptyState({
  mode,
  onAction,
}: {
  mode: 'people' | 'groups';
  onAction: () => void;
}) {
  return (
    <View
      className="min-h-[520px] items-center justify-center bg-fill-weaker px-6"
      style={{ borderRadius: radius(24) }}
    >
      <Image
        source={EMPTY_IMG}
        style={{ width: hs(88), height: hs(88), marginBottom: 12 }}
        resizeMode="contain"
      />
      <Text className="mt-4 text-center" style={{ ...TYPE.cardTitle, color: COLORS.textStrong }}>
        {mode === 'people' ? 'No beneficiary invited yet' : 'No group created yet'}
      </Text>
      <Text className="mt-3 max-w-[310px] text-center" style={{ ...TYPE.body, color: COLORS.textWeak }}>
        {mode === 'people'
          ? "You haven’t added any beneficiaries to your Memento yet."
          : 'Create a group to organize the people who matter most.'}
      </Text>
      <Button
        onPress={onAction}
        size="lg"
        className="mt-6 h-14 w-full max-w-[360px]"
      >
        {mode === 'people' ? 'Invite Beneficiary' : 'Create Group'}
      </Button>
    </View>
  );
}
