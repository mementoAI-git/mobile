import React, { useMemo, useCallback, useState, useEffect, forwardRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Lock, Search, Users, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useGroups } from '@/hooks/queries/use-groups';
import type { IBeneficiary, IGroup } from '@/types';
import { COLORS, FONTS } from '@/constants/tokens';

export type PrivacyMode = 'private' | 'all' | 'specific';

interface Props {
  mode: PrivacyMode;
  selectedBeneficiaryIds: string[];
  selectedGroupIds: string[];
  onModeChange: (mode: PrivacyMode) => void;
  onToggleBeneficiary: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onApply?: (mode: PrivacyMode, beneficiaryIds: string[], groupIds: string[]) => void;
  onClose: () => void;
}

interface DisplayItem {
  id: string;
  name: string;
  isGroup: boolean;
  initial: string;
}

const SAMPLE_BENEFICIARIES: IBeneficiary[] = [
  { _id: 'sample-alexander', name: 'Alexander Wang', email: 'alexander@example.com', relationship: 'Friend', level: 1 } as any,
  { _id: 'sample-bojanovic', name: 'Bojanovic Samvel', email: 'bojanovic@example.com', relationship: 'Colleague', level: 1 } as any,
  { _id: 'sample-lisa', name: 'Lisa Doherty', email: 'lisa@example.com', relationship: 'Sister', level: 1 } as any,
];

const SAMPLE_GROUPS: IGroup[] = [
  { _id: 'sample-group-family', name: 'Family', description: 'Family members' } as any,
  { _id: 'sample-group-friends', name: 'Friends', description: 'Close friends' } as any,
  { _id: 'sample-group-the-boys', name: 'The Boys', description: 'Weekend crew' } as any,
];

const RECENT_PILLS = [
  { label: '@Family', bg: '#EFF6FF', text: '#2563EB', border: '#DBEAFE', groupName: 'Family' },
  { label: '@Friends', bg: '#ECFDF5', text: '#059669', border: '#D1FAE5', groupName: 'Friends' },
  { label: '@Church', bg: '#FFF1F2', text: '#E11D48', border: '#FFE4E6', groupName: 'Church' },
  { label: '@Victor', bg: '#F5F3FF', text: '#7C3AED', border: '#EDE9FE', personName: 'Victor' },
  { label: '@Fela', bg: '#ECFEFF', text: '#0D9488', border: '#CFFAFE', personName: 'Fela' },
];

export const PublishPrivacySheet = forwardRef<BottomSheetModal, Props>(function PublishPrivacySheet({
  mode,
  selectedBeneficiaryIds,
  selectedGroupIds,
  onModeChange,
  onToggleBeneficiary,
  onToggleGroup,
  onApply,
  onClose,
}, ref) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  // Draft states so Dismiss vs Apply changes function cleanly
  const [draftMode, setDraftMode] = useState<PrivacyMode>(mode);
  const [draftBeneficiaryIds, setDraftBeneficiaryIds] = useState<string[]>(selectedBeneficiaryIds);
  const [draftGroupIds, setDraftGroupIds] = useState<string[]>(selectedGroupIds);

  useEffect(() => {
    setDraftMode(mode);
    setDraftBeneficiaryIds(selectedBeneficiaryIds);
    setDraftGroupIds(selectedGroupIds);
  }, [mode, selectedBeneficiaryIds, selectedGroupIds]);

  const { data: beneficiariesRaw } = useBeneficiaries();
  const { data: groupsRaw } = useGroups();

  const beneficiaries = useMemo<IBeneficiary[]>(() => {
    const list = Array.isArray(beneficiariesRaw)
      ? beneficiariesRaw
      : Array.isArray((beneficiariesRaw as any)?.docs)
      ? (beneficiariesRaw as any).docs
      : [];
    return list.length > 0 ? list : SAMPLE_BENEFICIARIES;
  }, [beneficiariesRaw]);

  const groups = useMemo<IGroup[]>(() => {
    const list = Array.isArray(groupsRaw)
      ? groupsRaw
      : Array.isArray((groupsRaw as any)?.docs)
      ? (groupsRaw as any).docs
      : [];
    return list.length > 0 ? list : SAMPLE_GROUPS;
  }, [groupsRaw]);

  // Combined item list (users then groups) matching the design order
  const displayItems = useMemo<DisplayItem[]>(() => {
    const query = search.trim().toLowerCase();
    const userItems: DisplayItem[] = beneficiaries
      .filter((b) => Boolean(b._id))
      .map((b) => ({
        id: b._id!,
        name: b.name || b.email,
        isGroup: false,
        initial: (b.name || b.email || 'U').charAt(0).toUpperCase(),
      }));

    const groupItems: DisplayItem[] = groups
      .filter((g) => Boolean(g._id))
      .map((g) => ({
        id: g._id,
        name: g.name,
        isGroup: true,
        initial: (g.name || 'G').charAt(0).toUpperCase(),
      }));

    const combined = [...userItems, ...groupItems];
    if (!query) return combined;
    return combined.filter((item) => item.name.toLowerCase().includes(query));
  }, [beneficiaries, groups, search]);

  const isSpecific = draftMode === 'specific' || draftBeneficiaryIds.length > 0 || draftGroupIds.length > 0;

  const handleSelectPrivate = useCallback(() => {
    Haptics.selectionAsync();
    setDraftMode('private');
  }, []);

  const handleSelectEveryone = useCallback(() => {
    Haptics.selectionAsync();
    setDraftMode('all');
  }, []);

  const handleToggleItem = useCallback((item: DisplayItem) => {
    Haptics.selectionAsync();
    if (item.isGroup) {
      setDraftGroupIds((prev) => {
        const next = prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id];
        return next;
      });
    } else {
      setDraftBeneficiaryIds((prev) => {
        const next = prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id];
        return next;
      });
    }
    // If toggling specific members, ensure mode reflects specific selection when not explicitly private
    setDraftMode((prev) => (prev === 'private' ? 'private' : 'specific'));
  }, []);

  const handleToggleRecentPill = useCallback((pill: (typeof RECENT_PILLS)[0]) => {
    Haptics.selectionAsync();
    if (pill.groupName) {
      const match = groups.find((g) => g.name.toLowerCase() === pill.groupName.toLowerCase());
      if (match) {
        setDraftGroupIds((prev) =>
          prev.includes(match._id) ? prev.filter((id) => id !== match._id) : [...prev, match._id]
        );
        setDraftMode((prev) => (prev === 'private' ? 'private' : 'specific'));
      }
    } else if (pill.personName) {
      const match = beneficiaries.find((b) => (b.name || '').toLowerCase().includes(pill.personName.toLowerCase()));
      if (match?._id) {
        setDraftBeneficiaryIds((prev) =>
          prev.includes(match._id!) ? prev.filter((id) => id !== match._id!) : [...prev, match._id!]
        );
        setDraftMode((prev) => (prev === 'private' ? 'private' : 'specific'));
      }
    }
  }, [beneficiaries, groups]);

  const handleDismiss = useCallback(() => {
    Haptics.selectionAsync();
    // Revert drafts
    setDraftMode(mode);
    setDraftBeneficiaryIds(selectedBeneficiaryIds);
    setDraftGroupIds(selectedGroupIds);
    onClose();
  }, [mode, selectedBeneficiaryIds, selectedGroupIds, onClose]);

  const handleApply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const finalMode = draftMode;

    if (onApply) {
      onApply(finalMode, draftBeneficiaryIds, draftGroupIds);
    } else {
      onModeChange(finalMode);
      // Synchronize beneficiaries
      for (const id of draftBeneficiaryIds) {
        if (!selectedBeneficiaryIds.includes(id)) onToggleBeneficiary(id);
      }
      for (const id of selectedBeneficiaryIds) {
        if (!draftBeneficiaryIds.includes(id)) onToggleBeneficiary(id);
      }
      // Synchronize groups
      for (const id of draftGroupIds) {
        if (!selectedGroupIds.includes(id)) onToggleGroup(id);
      }
      for (const id of selectedGroupIds) {
        if (!draftGroupIds.includes(id)) onToggleGroup(id);
      }
    }
    onClose();
  }, [
    draftMode,
    draftBeneficiaryIds,
    draftGroupIds,
    onApply,
    onModeChange,
    selectedBeneficiaryIds,
    onToggleBeneficiary,
    selectedGroupIds,
    onToggleGroup,
    onClose,
  ]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} pressBehavior="close" />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={['86%']}
      stackBehavior="push"
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={{ backgroundColor: '#E5E7EB', width: 42, height: 4, borderRadius: 2 }}
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
    >
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {/* ── Header ── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansBold, fontSize: 20, color: '#111827' }}>
            Who can see this story?
          </Text>
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F3F4F6',
            }}
          >
            <X size={18} color="#374151" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* ── Top Two Cards: Private & Everyone ── */}
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20 }}>
            {/* Private Card */}
            <TouchableOpacity
              onPress={handleSelectPrivate}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: '#FFF1F2',
                borderRadius: 16,
                padding: 14,
                position: 'relative',
              }}
            >
              {draftMode === 'private' && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -2,
                    zIndex: 10,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#22C55E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: '#FFE4E6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lock size={15} color="#EF4444" strokeWidth={2.4} />
                </View>
                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 15, color: '#111827' }}>
                  Private
                </Text>
              </View>
              <Text
                style={{
                  marginTop: 6,
                  fontFamily: FONTS.sans,
                  fontSize: 12,
                  lineHeight: 16,
                  color: '#EF4444',
                }}
              >
                Story is visible to only you
              </Text>
            </TouchableOpacity>

            {/* Everyone Card */}
            <TouchableOpacity
              onPress={handleSelectEveryone}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: '#EFF6FF',
                borderRadius: 16,
                padding: 14,
                position: 'relative',
              }}
            >
              {draftMode === 'all' && (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -2,
                    zIndex: 10,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#22C55E',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: '#DBEAFE',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={16} color="#2563EB" strokeWidth={2.2} />
                </View>
                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 15, color: '#111827' }}>
                  Everyone
                </Text>
              </View>
              <Text
                style={{
                  marginTop: 6,
                  fontFamily: FONTS.sans,
                  fontSize: 12,
                  lineHeight: 16,
                  color: '#3B82F6',
                }}
              >
                Story is visible to everyone.
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Search Input ── */}
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              backgroundColor: '#FFFFFF',
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              gap: 10,
            }}
          >
            <Search size={18} color="#9CA3AF" strokeWidth={1.8} />
            <BottomSheetTextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search user or group"
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1,
                fontFamily: FONTS.sans,
                fontSize: 14,
                color: '#111827',
                paddingVertical: 0,
              }}
            />
          </View>

          {/* ── Recently used: Section ── */}
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                paddingHorizontal: 20,
                fontFamily: FONTS.sans,
                fontSize: 13,
                color: '#6B7280',
                marginBottom: 8,
              }}
            >
              Recently used:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {RECENT_PILLS.map((pill) => (
                <TouchableOpacity
                  key={pill.label}
                  onPress={() => handleToggleRecentPill(pill)}
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: pill.bg,
                    borderColor: pill.border,
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONTS.sansSemi,
                      fontSize: 13,
                      color: pill.text,
                    }}
                  >
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Specific people & groups list ── */}
          <View
            accessibilityLabel="Specific people & groups"
            pointerEvents={isSpecific ? 'auto' : 'none'}
            style={{ marginTop: 12, paddingHorizontal: 20 }}
          >
            {displayItems.map((item) => {
              const isChecked = item.isGroup
                ? draftGroupIds.includes(item.id)
                : draftBeneficiaryIds.includes(item.id);

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleToggleItem(item)}
                  activeOpacity={0.7}
                  style={{
                    minHeight: 46,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Custom Checkbox */}
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isChecked ? '#FF5E00' : '#FFFFFF',
                      borderWidth: isChecked ? 0 : 1.5,
                      borderColor: '#D1D5DB',
                    }}
                  >
                    {isChecked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </View>

                  {/* Initial Avatar Circle */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#F3F4F6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONTS.sansBold,
                        fontSize: 13,
                        color: '#111827',
                      }}
                    >
                      {item.initial}
                    </Text>
                  </View>

                  {/* Name and Group Badge */}
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: FONTS.sansMedium,
                        fontSize: 14,
                        color: '#1F2937',
                      }}
                    >
                      {item.name}
                    </Text>

                    {item.isGroup && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: '#F3F4F6',
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ fontSize: 9, color: '#6B7280' }}>•</Text>
                        <Text
                          style={{
                            fontFamily: FONTS.sansMedium,
                            fontSize: 11,
                            color: '#4B5563',
                          }}
                        >
                          Group
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {displayItems.length === 0 && (
              <Text
                style={{
                  paddingVertical: 24,
                  textAlign: 'center',
                  fontFamily: FONTS.sans,
                  fontSize: 14,
                  color: '#9CA3AF',
                }}
              >
                No users or groups found.
              </Text>
            )}
          </View>
        </BottomSheetScrollView>

        {/* ── Bottom Action Buttons: Dismiss & Apply changes ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom + 6, 20),
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F3F4F6',
          }}
        >
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: FONTS.sansSemi,
                fontSize: 15,
                color: '#111827',
              }}
            >
              Dismiss
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleApply}
            activeOpacity={0.85}
            style={{
              flex: 1.2,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#FF5E00',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#FF5E00',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontFamily: FONTS.sansSemi,
                fontSize: 15,
                color: '#FFFFFF',
              }}
            >
              Apply changes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
});

PublishPrivacySheet.displayName = 'PublishPrivacySheet';
