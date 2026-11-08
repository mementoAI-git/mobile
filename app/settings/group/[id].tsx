import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Settings2 from 'lucide-react-native/icons/settings-2';
import Users from 'lucide-react-native/icons/users';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
import { useGroups } from '@/hooks/queries/use-groups';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useRemoveGroupMember } from '@/hooks/mutations/use-group-mutations';
import { COLORS as LIGHT_COLORS } from '@/constants/tokens';
import { Button, ResponsiveScreen, Skeleton } from '@/components/ui';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import { PersonCard } from '@/components/beneficiaries/PersonCard';
import { BeneficiaryEmptyState } from '@/components/beneficiaries/BeneficiaryEmptyState';
import { normalizeCollection } from '@/features/beneficiaries/collections';
import { groupCardDetails, isGroupMember } from '@/features/beneficiaries/people-cards';
import { GROUP_COLOR_PALETTE } from '@/features/beneficiaries/sheet-forms';
import { TYPE } from '@/constants/typography';
import type { IBeneficiary, IGroup } from '@/types';

// Web --group-on-color: dark ink on the pastel group colours in every theme.
const GROUP_ON_COLOR = LIGHT_COLORS.textStrong;

/** Mirrors web group-detail-page.tsx: coloured summary, "Group members" and member cards. */
export default function GroupDetailScreen() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const openSheet = useUiStore((s) => s.openSheet);

  const { data: groupsData, isLoading: loadingGroups } = useGroups();
  const { data: beneficiariesData, isLoading: loadingBeneficiaries } = useBeneficiaries();
  const { mutateAsync: removeGroupMember } = useRemoveGroupMember();

  const group = useMemo(
    () => normalizeCollection<IGroup>(groupsData).find((item) => item._id === id) ?? null,
    [groupsData, id],
  );

  // People whose groups include this one, plus anyone the group lists directly.
  const members = useMemo(() => {
    const people = normalizeCollection<IBeneficiary>(beneficiariesData);
    return id ? people.filter((person) => isGroupMember(person, group, id)) : [];
  }, [beneficiariesData, group, id]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings/beneficiaries');
  }, [router]);

  const handleAddMember = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('add-member-to-group', { groupId: group?._id });
  }, [openSheet, group]);

  const handleEditGroup = useCallback(() => {
    if (!group) return;
    Haptics.selectionAsync();
    openSheet('create-group', { editData: group });
  }, [openSheet, group]);

  const handleRemoveMember = useCallback((member: IBeneficiary) => {
    Haptics.selectionAsync();
    const name = member.name || member.email || 'this person';
    openSheet('security-confirmation', {
      kind: 'remove-member',
      title: `Remove ${name} from this group?`,
      confirmLabel: 'Remove from group',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (!member._id || !id) return;
        await removeGroupMember({ beneficiaryId: member._id, groupId: id });
      },
    });
  }, [id, openSheet, removeGroupMember]);

  const loading = loadingGroups || loadingBeneficiaries;
  const swatchColor = group ? GROUP_COLOR_PALETTE[group.color ?? 1]?.color ?? COLORS.info : COLORS.info;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <SettingsSubpageHeader title={group?.name || 'Group'} onBack={handleBack} />
      <ResponsiveScreen maxWidth={720}>

        {loading ? (
          <View style={{ gap: 16, paddingTop: 8 }}>
            <Skeleton className="h-[96px] w-full rounded-[20px]" />
            <Skeleton className="h-[96px] w-full rounded-[20px]" />
          </View>
        ) : !group ? (
          <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, paddingTop: 8 }}>
            This group no longer exists.
          </Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 48, gap: 40 }}>
            <View style={[styles.summary, { backgroundColor: swatchColor }]} accessibilityLabel="Group summary">
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ ...TYPE.profileName, color: GROUP_ON_COLOR }}>{group.name}</Text>
                <Text style={{ ...TYPE.bodySmall, color: GROUP_ON_COLOR, marginTop: 4 }}>
                  {groupCardDetails(group, members.length).join('  ·  ')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleEditGroup}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel="Group settings"
                style={styles.settingsButton}
              >
                <Settings2 size={20} color={GROUP_ON_COLOR} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16 }}>
              <View style={styles.membersHeader}>
                <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Group members</Text>
                <Button
                  variant="secondary"
                  rounded="full"
                  className="h-11 px-4"
                  leftIcon={<Users size={20} color={COLORS.textStrong} />}
                  onPress={handleAddMember}
                >
                  Manage
                </Button>
              </View>

              {members.length === 0 ? (
                <BeneficiaryEmptyState mode="members" />
              ) : (
                members.map((member) => (
                  <PersonCard
                    key={member._id}
                    name={member.name || member.email || 'Unknown person'}
                    email={member.email}
                    user={member.user}
                    details={member.relationship ? [member.relationship.charAt(0).toUpperCase() + member.relationship.slice(1)] : []}
                    onOptions={() => handleRemoveMember(member)}
                  />
                ))
              )}
            </View>
          </ScrollView>
        )}
      </ResponsiveScreen>
    </SafeAreaView>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: 20,
    borderRadius: 20,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    // Web: color-mix(group-on-color 10%, transparent).
    backgroundColor: LIGHT_COLORS.strokeWeak,
  },
  membersHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
