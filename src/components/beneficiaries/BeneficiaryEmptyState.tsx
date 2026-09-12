import React from 'react';
import { Text, View } from 'react-native';
import { FolderHeart, UserRoundPlus } from 'lucide-react-native';
import { Button } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

export function BeneficiaryEmptyState({
  mode,
  onAction,
}: {
  mode: 'people' | 'groups';
  onAction: () => void;
}) {
  const Icon = mode === 'people' ? UserRoundPlus : FolderHeart;
  return (
    <View className="min-h-[520px] items-center justify-center rounded-[24px] bg-fill-weaker px-6">
      <Icon size={70} color={COLORS.textDisabled} strokeWidth={1.7} />
      <Text className="mt-9 text-center" style={{ ...TYPE.cardTitle, color: COLORS.textStrong }}>
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
        className="mt-5 h-14 w-full max-w-[360px]"
        leftIcon={<Icon size={22} color={COLORS.textInverse} />}
      >
        {mode === 'people' ? 'Invite Beneficiary' : 'Create Group'}
      </Button>
    </View>
  );
}
