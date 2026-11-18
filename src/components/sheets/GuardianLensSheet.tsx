import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import { SheetActions, SHEET_FILL } from './SheetActions';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { useRouter } from 'expo-router';
import { useStories } from '@/hooks/queries/use-memories';
import { useCapsules } from '@/hooks/queries/use-capsules';
import { useGuardianLensStore } from '@/store/guardian-lens.store';
import type { IBeneficiary, ICapsule } from '@/types';

interface GuardianLensSheetProps {
  beneficiary: IBeneficiary;
  onClose?: () => void;
}

export function GuardianLensSheet({
  beneficiary,
  onClose,
}: GuardianLensSheetProps) {
  const { data: storiesData } = useStories({ limit: 50 });
  const { data: capsulesData } = useCapsules();

  useEffect(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const stories = storiesData?.pages?.flatMap((p) => p?.docs ?? []) ?? [];
  const capsules = capsulesData?.pages?.flatMap((p) => p?.docs ?? []) ?? [];

  // Stories accessible to beneficiaries: either not explicitly private, or tagged for family/beneficiaries
  const sharedStoriesCount = stories.filter((s) => s.visibility !== 'private').length;
  const privateStoriesCount = Math.max(0, stories.length - sharedStoriesCount);

  // Capsules with matching recipient email or name
  const beneficiaryEmail = beneficiary.email.toLowerCase();
  const designatedCapsulesCount = capsules.filter((c: ICapsule) =>
    c.recipients?.some((r) =>
      r.email?.toLowerCase() === beneficiaryEmail ||
      `${r.first_name || ''} ${r.last_name || ''}`.trim().toLowerCase() === beneficiary.name.toLowerCase()
    )
  ).length;

  const router = useRouter();

  const handleDismiss = () => {
    void Haptics.selectionAsync();
    onClose?.();
  };

  const handleSimulateInFeed = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    useGuardianLensStore.getState().setSimulation(beneficiary);
    onClose?.();
    router.push('/(tabs)/stories');
  };

  return (
    <View style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
      <SheetHeader
        title={`${beneficiary.name}’s view`}
        onClose={handleDismiss}
        closeLabel="Close Guardian Lens preview"
      />

      <View style={{ gap: SHEET_SECTION_GAP }}>
      <Text className="text-text-weak" style={TYPE.body}>
        This simulation previews what {beneficiary.name} can access in your legacy vault according to your sharing permissions.
      </Text>

      {/* Breakdown Grid */}
      <View className="gap-3">
        {/* Unlocked / Shared Card */}
        <View className="rounded-3xl bg-fill-weaker border border-stroke-weaker p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-strong" style={TYPE.cardTitle}>
              Shared with {beneficiary.name.split(' ')[0]}
            </Text>
            <View className="bg-success/15 px-2.5 py-1 rounded-full">
              <Text className="text-success uppercase tracking-wider" style={TYPE.metadata}>
                Accessible
              </Text>
            </View>
          </View>

          <View className="gap-2 pl-1">
            <Text className="text-text-base" style={TYPE.bodySmall}>
              • {sharedStoriesCount} Story {sharedStoriesCount === 1 ? 'archive' : 'archives'} designated for family
            </Text>
            <Text className="text-text-base" style={TYPE.bodySmall}>
              • {designatedCapsulesCount} Scheduled time {designatedCapsulesCount === 1 ? 'capsule' : 'capsules'}
            </Text>
          </View>
        </View>

        {/* Strictly Private Card */}
        <View className="rounded-3xl bg-fill-weaker border border-stroke-weaker p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-strong" style={TYPE.cardTitle}>
              Strictly Private Vault
            </Text>
            <View className="bg-error/15 px-2.5 py-1 rounded-full">
              <Text className="text-error uppercase tracking-wider" style={TYPE.metadata}>
                Protected
              </Text>
            </View>
          </View>

          <View className="gap-2 pl-1">
            <Text className="text-text-base" style={TYPE.bodySmall}>
              • {privateStoriesCount} Personal unshared reflections & drafts
            </Text>
            <Text className="text-text-base" style={TYPE.bodySmall}>
              • Private Gemini voice session audio & transcripts
            </Text>
            <Text className="text-text-base" style={TYPE.bodySmall}>
              • Unassigned time capsules & personal media
            </Text>
          </View>
        </View>
      </View>

      {/* Security Assurance */}
      <View className="bg-brand/5 border-l-2 border-brand rounded-r-2xl p-4">
        <Text className="text-text-weak" style={TYPE.bodySmall}>
          Your memories are private to your account by default, encrypted in transit and at rest, and you choose what to share.
        </Text>
      </View>

      </View>

      {/* Action Buttons */}
      <SheetActions className="gap-3">
        <Button
          variant="primary"
          size="lg"
          rounded="full"
          className="h-14 w-full"
          onPress={handleSimulateInFeed}
        >
          Simulate in Stories Feed
        </Button>
        <Button
          variant="secondary"
          size="lg"
          rounded="full"
          className="h-14 w-full"
          onPress={handleDismiss}
        >
          Done Previewing
        </Button>
      </SheetActions>
    </View>
  );
}
