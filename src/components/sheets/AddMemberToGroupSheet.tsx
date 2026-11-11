import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Check from 'lucide-react-native/icons/check';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetHeader } from './SheetHeader';
import { SHEET_GROUP_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useGroups } from '@/hooks/queries/use-groups';
import { useSetGroupMembers } from '@/hooks/mutations/use-group-mutations';
import { normalizeCollection } from '@/features/beneficiaries/collections';
import { isGroupMember, membershipChanges, personCardDetails } from '@/features/beneficiaries/people-cards';
import { TYPE } from '@/constants/typography';
import { Avatar, Button } from '@/components/ui';
import type { IBeneficiary, IGroup } from '@/types';

interface Props {
  groupId: string;
  onClose?: () => void;
}

/** Manage a group's members: every person with a checkbox; Save applies the changes. */
export function AddMemberToGroupSheet({ groupId, onClose }: Props) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const { data: beneficiariesData } = useBeneficiaries();
  const { data: groupsData } = useGroups();
  const saveMembers = useSetGroupMembers(groupId);

  const people = useMemo(() => normalizeCollection<IBeneficiary>(beneficiariesData).filter((p) => p._id), [beneficiariesData]);
  const group = useMemo(
    () => normalizeCollection<IGroup>(groupsData).find((item) => item._id === groupId) ?? null,
    [groupsData, groupId],
  );
  const currentIds = useMemo(
    () => new Set(people.filter((p) => isGroupMember(p, group, groupId)).map((p) => p._id as string)),
    [people, group, groupId],
  );
  // null until the person first changes something, so it follows the loaded membership.
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const selected = draft ?? currentIds;
  const changes = membershipChanges(currentIds, selected);
  const changeCount = changes.add.length + changes.remove.length;

  const toggle = useCallback((id: string) => {
    Haptics.selectionAsync();
    setDraft((prev) => {
      const next = new Set(prev ?? currentIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [currentIds]);

  const save = useCallback(async () => {
    if (!changeCount || saveMembers.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await saveMembers.mutateAsync(changes);
      onClose?.();
    } catch {
      // The mutation shows the error toast; keep the sheet open to retry.
    }
  }, [changeCount, changes, onClose, saveMembers]);

  return (
    <View style={{ flex: 1 }}>
      <SheetHeader title="Manage members" onClose={() => onClose?.()} style={{ paddingHorizontal: 20 }} />

      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: SHEET_GROUP_GAP - 12, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {people.length === 0 ? (
          <Text style={{ ...TYPE.body, color: COLORS.textWeak, textAlign: 'center', paddingVertical: 40 }}>
            Invite someone first, then add them to this group.
          </Text>
        ) : (
          people.map((person) => {
            const id = person._id as string;
            const name = person.name || person.email || 'Unknown person';
            const checked = selected.has(id);
            return (
              <TouchableOpacity
                key={id}
                onPress={() => toggle(id)}
                activeOpacity={0.76}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={name}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  padding: 20,
                  borderRadius: 20,
                  backgroundColor: COLORS.settingsCard,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.strokeWeak, backgroundColor: COLORS.fillWeak }}>
                  <Avatar uri={person.user?.picture_url} userId={person.user?._id} seed={person.user?.email || person.email} name={name} size="lg" className="h-full w-full border-0" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ ...TYPE.bodyStrong, color: COLORS.textStrong }}>{name}</Text>
                  <Text numberOfLines={1} style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 2 }}>
                    {personCardDetails(person).join(' · ')}
                  </Text>
                </View>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: checked ? COLORS.brand : COLORS.strokeStrong,
                    backgroundColor: checked ? COLORS.brand : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {checked ? <Check size={16} color={COLORS.textInverse} strokeWidth={3} /> : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </BottomSheetScrollView>

      <View style={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: getSheetActionsBottomPadding(insets.bottom),
        backgroundColor: COLORS.sheet,
      }}>
        <Button
          size="lg"
          rounded="full"
          className="h-14 w-full"
          loading={saveMembers.isPending}
          disabled={changeCount === 0 || saveMembers.isPending}
          onPress={() => void save()}
        >
          Save changes
        </Button>
      </View>
    </View>
  );
}
