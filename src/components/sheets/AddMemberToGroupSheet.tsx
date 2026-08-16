import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '@/store';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useAddGroupMembers } from '@/hooks/mutations/use-group-mutations';
import { COLORS, FONTS } from '@/constants/tokens';
import { Avatar, Button } from '@/components/ui';

interface Props {
  groupId: string;
}

export function AddMemberToGroupSheet({ groupId }: Props) {
  const insets = useSafeAreaInsets();
  const closeSheet = useUiStore((s) => s.closeSheet);
  const { data: beneficiariesData } = useBeneficiaries();
  const { mutate: addMembers, isPending } = useAddGroupMembers(groupId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter for beneficiaries who are NOT in the group already
  const nonMembers = useMemo(() => {
    if (!beneficiariesData || !groupId) return [];
    let list: any[] = [];
    if (Array.isArray(beneficiariesData)) list = beneficiariesData;
    else if (Array.isArray((beneficiariesData as any).docs)) list = (beneficiariesData as any).docs;

    return list.filter((b) => {
      if (!b.groups || !Array.isArray(b.groups)) return true;
      return !b.groups.some((g: any) => g === groupId || g._id === groupId);
    });
  }, [beneficiariesData, groupId]);

  const handleClose = useCallback(() => {
    Haptics.selectionAsync();
    closeSheet();
  }, [closeSheet]);

  const toggleSelection = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedIds.size === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    addMembers(
      { beneficiaryIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          closeSheet();
        },
      }
    );
  }, [addMembers, selectedIds, closeSheet]);

  return (
    <View style={{ flex: 1 }}>
      {/* ── Header ── */}
      <View style={{ height: 68, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: FONTS.sansBold, fontSize: 20, color: COLORS.textStrong }}>
          Add Member to group
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.fillWeak }}
        >
          <X size={22} color={COLORS.textStrong} />
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {nonMembers.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: COLORS.textWeak, textAlign: 'center' }}>
              All your beneficiaries are already in this group.
            </Text>
          </View>
        ) : (
          nonMembers.map(member => {
            const name = member.name || member.email || 'Unknown';
            const statusText = member.status === 'pending' ? 'Pending invite' : (member.relationship || 'Member');
            const isSelected = selectedIds.has(member._id);

            return (
              <TouchableOpacity
                key={member._id}
                onPress={() => toggleSelection(member._id)}
                activeOpacity={0.7}
                style={[
                  styles.memberCard,
                  isSelected && { borderColor: COLORS.brand }
                ]}
              >
                <View style={{ marginRight: 16 }}>
                  <Avatar
                    uri={member.avatar}
                    name={name}
                    size="md"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.sansBold, fontSize: 17, color: COLORS.textStrong }} numberOfLines={1}>
                    {name}
                  </Text>
                  {member.email && (
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, marginTop: 2 }} numberOfLines={1}>
                      {member.email}
                    </Text>
                  )}
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textMuted, marginTop: 2 }}>
                    {statusText}
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected
                ]}>
                  {isSelected && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </BottomSheetScrollView>

      {/* ── Footer ── */}
      <View style={{
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: Math.max(insets.bottom, 16),
        borderTopWidth: 1,
        borderTopColor: COLORS.strokeWeaker,
        backgroundColor: COLORS.background,
      }}>
        <Button variant="secondary" size="lg" className="h-[56px] flex-1" textClassName="text-base font-bold" onPress={handleClose}>
          Dismiss
        </Button>
        <Button
          size="lg"
          className="h-[56px] flex-1 bg-text-strong"
          textClassName="text-base font-bold text-white"
          loading={isPending}
          disabled={selectedIds.size === 0 || isPending}
          onPress={handleSubmit}
        >
          {selectedIds.size > 0 ? `Add ${selectedIds.size} ${selectedIds.size === 1 ? 'person' : 'people'}` : 'Add member'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    borderRadius: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  }
});
