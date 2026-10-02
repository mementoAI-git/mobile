import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button, Avatar } from '@/components/ui';
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
    <View className="flex-grow px-5 pb-8 pt-2">
      {/* Top Bar with Simulation Pill & 44x44 Close Button */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-1.5 bg-brand/10 rounded-full px-3 py-1">
          <View className="size-1.5 rounded-full bg-brand" />
          <Text className="text-brand uppercase tracking-wider" style={TYPE.metadata}>
            Guardian Lens Simulation
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close Guardian Lens preview"
          className="size-11 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      {/* Header Profile Info */}
      <View className="flex-row items-center gap-3.5 mb-5">
        <Avatar uri={beneficiary.user?.picture_url} name={beneficiary.name} size="lg" />
        <View className="flex-1">
          <Text className="text-text-strong" style={TYPE.sectionTitle}>
            {beneficiary.name}’s View
          </Text>
          <Text className="text-text-weak" style={TYPE.bodySmall}>
            {beneficiary.relationship || 'Designated Beneficiary'} · {beneficiary.email}
          </Text>
        </View>
      </View>

      <Text className="text-text-weak mb-5" style={TYPE.body}>
        This simulation previews what {beneficiary.name} can access in your legacy vault according to your sharing permissions.
      </Text>

      {/* Breakdown Grid */}
      <View className="gap-3 mb-6">
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
      <View className="bg-brand/5 border-l-2 border-brand rounded-r-2xl p-4 mb-6">
        <Text className="text-text-weak" style={TYPE.bodySmall}>
          Zero-knowledge privacy protects all unshared personal memories until you explicitly grant access.
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="gap-3">
        <Button
          variant="primary"
          size="lg"
          className="h-14 w-full"
          onPress={handleSimulateInFeed}
        >
          Simulate in Stories Feed
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="h-14 w-full"
          onPress={handleDismiss}
        >
          Done Previewing
        </Button>
      </View>
    </View>
  );
}
