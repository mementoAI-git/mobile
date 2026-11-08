import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Text, View } from 'react-native';
import { TYPE } from '@/constants/typography';

const COPY = {
  people: { title: 'No people yet', description: 'Invite someone to start sharing memories together.' },
  groups: { title: 'No groups yet', description: 'Create a group to organize your people.' },
  members: { title: 'No members yet', description: 'Add people from your connections.' },
} as const;

/** Web settings empty card; the screen's header pill holds the action. */
export function BeneficiaryEmptyState({ mode }: { mode: keyof typeof COPY }) {
  const COLORS = useThemeColors();
  const copy = COPY[mode];
  return (
    <View style={{ borderRadius: 24, paddingHorizontal: 16, paddingVertical: 40, alignItems: 'center', backgroundColor: COLORS.settingsCard }}>
      <Text style={{ ...TYPE.label, color: COLORS.textStrong, textAlign: 'center' }}>{copy.title}</Text>
      <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, textAlign: 'center', marginTop: 4 }}>{copy.description}</Text>
    </View>
  );
}
