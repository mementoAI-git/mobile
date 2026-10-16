import React, { useMemo, useCallback, useState, useEffect, forwardRef } from 'react';
import { View, Text } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSheetTopInset } from '@/features/layout/sheet-safe-area';
import Check from 'lucide-react-native/icons/check';
import Lock from 'lucide-react-native/icons/lock';
import Search from 'lucide-react-native/icons/search';
import Users from 'lucide-react-native/icons/users';
import X from 'lucide-react-native/icons/x';
import * as Haptics from 'expo-haptics';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useGroups } from '@/hooks/queries/use-groups';
import type { IBeneficiary, IGroup } from '@/types';

import { Skeleton } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { normalizeCollection } from '@/features/beneficiaries/collections';
import { buildAudienceRecipientItems, type AudienceRecipientItem } from '@/features/memories/audience-recipient-items';
import { canApplyMemoryAudience } from '@/features/memories/memory-audience';

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

  const beneficiariesQuery = useBeneficiaries();
  const groupsQuery = useGroups();

  const beneficiaries = useMemo<IBeneficiary[]>(() => {
    return normalizeCollection<IBeneficiary>(beneficiariesQuery.data);
  }, [beneficiariesQuery.data]);

  const groups = useMemo<IGroup[]>(() => {
    return normalizeCollection<IGroup>(groupsQuery.data);
  }, [groupsQuery.data]);

  // Combined item list (users then groups) matching the design order
  const displayItems = useMemo(() => buildAudienceRecipientItems(beneficiaries, groups, search), [beneficiaries, groups, search]);

  const isLoadingRecipients = beneficiariesQuery.isLoading || groupsQuery.isLoading;
  const hasRecipientError = beneficiariesQuery.isError || groupsQuery.isError;
  const canApply = canApplyMemoryAudience({ mode: draftMode === 'all' ? 'everyone' : draftMode, beneficiaryIds: draftBeneficiaryIds, groupIds: draftGroupIds });

  const handleSelectPrivate = useCallback(() => {
    Haptics.selectionAsync();
    setDraftMode('private');
  }, []);

  const handleSelectEveryone = useCallback(() => {
    Haptics.selectionAsync();
    setDraftMode('all');
  }, []);

  const handleToggleItem = useCallback((item: AudienceRecipientItem) => {
    Haptics.selectionAsync();
    if (item.kind === 'group') {
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
    setDraftMode('specific');
  }, []);

  const resetDraft = useCallback(() => {
    setDraftMode(mode);
    setDraftBeneficiaryIds(selectedBeneficiaryIds);
    setDraftGroupIds(selectedGroupIds);
    setSearch('');
  }, [mode, selectedBeneficiaryIds, selectedGroupIds]);

  const handleDismiss = useCallback(() => {
    Haptics.selectionAsync();
    resetDraft();
    onClose();
  }, [resetDraft, onClose]);

  const handleApply = useCallback(() => {
    if (!canApply) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const finalMode = draftMode;
    const finalBeneficiaryIds = finalMode === 'specific' ? draftBeneficiaryIds : [];
    const finalGroupIds = finalMode === 'specific' ? draftGroupIds : [];

    if (onApply) {
      onApply(finalMode, finalBeneficiaryIds, finalGroupIds);
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
    canApply,
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
      topInset={getSheetTopInset(insets.top)}
      index={0}
      snapPoints={['86%']}
      stackBehavior="push"
      enablePanDownToClose
      onDismiss={resetDraft}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={{ backgroundColor: COLORS.strokeStrong, opacity: 0.3, width: 42, height: 4, borderRadius: 2 }}
      backgroundStyle={{ backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
    >
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
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
          <Text style={{ ...TYPE.sectionTitle, color: COLORS.textStrong }}>
            Who can see this story?
          </Text>
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.fillWeak,
            }}
          >
            <X size={18} color={COLORS.textBase} strokeWidth={2} />
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
                backgroundColor: `${COLORS.error}0D`,
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
                    backgroundColor: COLORS.success,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: COLORS.card,
                  }}
                >
                  <Check size={11} color={COLORS.textInverse} strokeWidth={3} />
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: `${COLORS.error}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Lock size={15} color={COLORS.error} strokeWidth={2.4} />
                </View>
                <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
                  Private
                </Text>
              </View>
              <Text
                style={{
                  marginTop: 6,
                  ...TYPE.metadata,
                  lineHeight: 16,
                  color: COLORS.error,
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
                backgroundColor: `${COLORS.info}0D`,
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
                    backgroundColor: COLORS.success,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: COLORS.card,
                  }}
                >
                  <Check size={11} color={COLORS.textInverse} strokeWidth={3} />
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: `${COLORS.info}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={16} color={COLORS.info} strokeWidth={2.2} />
                </View>
                <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
                  Everyone
                </Text>
              </View>
              <Text
                style={{
                  marginTop: 6,
                  ...TYPE.metadata,
                  lineHeight: 16,
                  color: COLORS.info,
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
              borderColor: COLORS.strokeWeak,
              backgroundColor: COLORS.fillWeaker,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              gap: 10,
            }}
          >
            <Search size={18} color={COLORS.textWeak} strokeWidth={1.8} />
            <BottomSheetTextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search user or group"
              placeholderTextColor={COLORS.textMuted}
              style={{
                flex: 1,
                ...TYPE.label,
                color: COLORS.textStrong,
                paddingVertical: 0,
              }}
            />
          </View>

          {/* ── Specific people & groups list ── */}
          <View
            accessibilityLabel="Specific people & groups"
            style={{ marginTop: 12, paddingHorizontal: 20 }}
          >
            {isLoadingRecipients && (
              <View style={{ paddingVertical: 8, gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 }}>
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="size-8 rounded-full" />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {!isLoadingRecipients && hasRecipientError && (
              <Text style={{ paddingVertical: 24, textAlign: 'center', ...TYPE.label, lineHeight: 20, color: COLORS.textWeak }}>
                We couldn’t load your trusted people. Private and Everyone are still available.
              </Text>
            )}

            {!isLoadingRecipients && !hasRecipientError && displayItems.map((item) => {
              const isChecked = item.kind === 'group'
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
                      backgroundColor: isChecked ? COLORS.brand : COLORS.card,
                      borderWidth: isChecked ? 0 : 1.5,
                      borderColor: COLORS.strokeWeak,
                    }}
                  >
                    {isChecked && <Check size={13} color={COLORS.textInverse} strokeWidth={3} />}
                  </View>

                  {/* Initial Avatar Circle */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: COLORS.fillWeak,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        ...TYPE.bodySmall,
                        color: COLORS.textStrong,
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
                        ...TYPE.label,
                        color: COLORS.textStrong,
                      }}
                    >
                      {item.name}
                    </Text>

                    {item.kind === 'group' && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: COLORS.fillWeak,
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ ...TYPE.eyebrow, color: COLORS.textWeak }}>•</Text>
                        <Text
                          style={{
                            ...TYPE.metadata,
                            color: COLORS.textBase,
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

            {!isLoadingRecipients && !hasRecipientError && displayItems.length === 0 && (
              <Text
                style={{
                  paddingVertical: 24,
                  textAlign: 'center',
                  ...TYPE.label,
                  color: COLORS.textWeak,
                }}
              >
                {search.trim()
                  ? 'No people or groups match your search.'
                  : 'Your trusted circle starts here. Add people or groups in Settings.'}
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
            backgroundColor: COLORS.background,
            borderTopWidth: 1,
            borderTopColor: COLORS.strokeWeaker,
          }}
        >
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.8}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 26,
              backgroundColor: COLORS.fillWeak,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                ...TYPE.body,
                color: COLORS.textStrong,
              }}
            >
              Dismiss
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleApply}
            disabled={!canApply}
            activeOpacity={0.85}
            style={{
              flex: 1.2,
              height: 52,
              borderRadius: 26,
              backgroundColor: COLORS.brand,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: COLORS.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
              opacity: canApply ? 1 : 0.45,
            }}
          >
            <Text
              style={{
                ...TYPE.body,
                color: COLORS.textInverse,
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
