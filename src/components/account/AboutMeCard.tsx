import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { TYPE } from '@/constants/typography';

interface AboutMeCardProps {
  biography?: string | null;
  onEdit: () => void;
}

export const AboutMeCard = React.memo(function AboutMeCard({ biography, onEdit }: AboutMeCardProps) {
  return (
    <View className="rounded-[24px] border border-stroke-weak bg-fill-weak p-5 gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text accessibilityRole="header" className="text-text-strong" style={TYPE.buttonSmall}>About me</Text>
        <Button variant="outline" size="md" rounded="full" onPress={onEdit} accessibilityLabel="Edit About me">Edit</Button>
      </View>
      <Text className="text-text-base" style={TYPE.bodySmall}>
        {biography?.trim() || 'Write a little about yourself, in your own words.'}
      </Text>
    </View>
  );
});
