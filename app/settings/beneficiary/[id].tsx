import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ImageBackground, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, UserRoundPen, Trash2, MailWarning, MailPlus, UserRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useGroups } from '@/hooks/queries/use-groups';
import { useRemoveBeneficiary, useResendInvite } from '@/hooks/mutations/use-beneficiary-mutations';
import { COLORS, FONTS } from '@/constants/tokens';
import { Avatar, Skeleton, EmptyState } from '@/components/ui';
import { toast } from '@/components/ui/Toast';
import { GROUP_COLOR_PALETTE } from '@/features/beneficiaries/sheet-forms';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

export default function BeneficiaryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const openSheet = useUiStore((s) => s.openSheet);
  
  const { data: beneficiariesData, isLoading: loadingBeneficiaries } = useBeneficiaries();
  const { data: groupsData, isLoading: loadingGroups } = useGroups();
  
  const { mutate: removeBeneficiary } = useRemoveBeneficiary();
  const { mutate: resendInvite, isPending: isResending } = useResendInvite();

  // Find the specific beneficiary
  const beneficiary = useMemo(() => {
    if (!beneficiariesData || !id) return null;
    let list: any[] = [];
    if (Array.isArray(beneficiariesData)) list = beneficiariesData;
    else if (Array.isArray((beneficiariesData as any).docs)) list = (beneficiariesData as any).docs;
    return list.find(b => b._id === id || b.email === id);
  }, [beneficiariesData, id]);

  // Expand the full group objects they belong to (to grab their unique names & colors for badging)
  const beneficiaryGroups = useMemo(() => {
    if (!beneficiary || !beneficiary.groups || !groupsData) return [];
    
    let allGroupsList: any[] = [];
    if (Array.isArray(groupsData)) allGroupsList = groupsData;
    else if (Array.isArray((groupsData as any).docs)) allGroupsList = (groupsData as any).docs;

    const matchedGroups = beneficiary.groups
      .map((groupIdOrObj: any) => {
        const gId = typeof groupIdOrObj === 'string' ? groupIdOrObj : groupIdOrObj._id;
        const gObj = allGroupsList.find((g: any) => g._id === gId);
        return gObj || null;
      })
      .filter(Boolean) as any[];
    
    return matchedGroups;
  }, [beneficiary, groupsData]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings/beneficiaries');
  }, [router]);

  // Edit user calls the pre-existing beneficiary actions sheet or add-beneficiary flow pre-seeded.
  const handleEditUser = useCallback(() => {
    if (!beneficiary) return;
    Haptics.selectionAsync();
    // Assuming 'add-beneficiary' can act as edit if we pass data, otherwise 
    // it falls back to a future user-edit implementation.
    openSheet('add-beneficiary', { editData: beneficiary });
  }, [openSheet, beneficiary]);

  const handleRemoveUser = useCallback(() => {
    if (!beneficiary) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openSheet('security-confirmation', {
      kind: 'remove-beneficiary',
      title: 'Remove user from beneficiary list?',
      description: 'Removing a beneficiary will delete their access to your Memento profile and info.',
      confirmLabel: 'Yes, remove',
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await new Promise<void>((resolve, reject) => {
          removeBeneficiary(beneficiary._id ?? beneficiary.email, {
            onSuccess: () => {
              useUiStore.getState().closeSheet();
              if (router.canGoBack()) router.back();
              else router.replace('/settings/beneficiaries');
              resolve();
            },
            onError: reject,
          });
        });
      }
    });
  }, [beneficiary, openSheet, removeBeneficiary, router]);

  const handleResend = useCallback(() => {
    if (!beneficiary || !beneficiary.email || isResending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resendInvite(beneficiary.email, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast('Invitation resent!', 'success');
      },
      onError: () => {
        toast('Could not resend invitation. Try again.', 'error');
      }
    });
  }, [beneficiary, isResending, resendInvite]);

  if (loadingBeneficiaries || loadingGroups) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View style={styles.header}>
          <View style={styles.backButton}><Skeleton style={{ width: '100%', height: '100%', borderRadius: 22 }} /></View>
        </View>
        <View style={{ padding: 24, gap: 16 }}>
          <Skeleton style={{ height: 120, width: '100%', borderRadius: 24 }} />
          <Skeleton style={{ height: 80, width: '100%', borderRadius: 24, marginTop: 24 }} />
          <Skeleton style={{ height: 80, width: '100%', borderRadius: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!beneficiary) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.78}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={23} color={COLORS.textBase} />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon={UserRound}
          title="Beneficiary not found"
          description="This person may have been removed or the invitation was cancelled."
          actionLabel="Back to beneficiaries"
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  const name = beneficiary.name || 'Pending invitation';
  const isPendingStatus = beneficiary.status === 'pending';
  const createdDate = beneficiary.created_at 
    ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(beneficiary.created_at))
    : 'Unknown';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.78}
          style={styles.backButton}
        >
          <ArrowLeft size={23} color={COLORS.textBase} />
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleEditUser}
            activeOpacity={0.78}
            style={styles.actionPill}
          >
            <UserRoundPen size={16} color={COLORS.textStrong} style={{ marginRight: 6 }} />
            <Text style={{ ...TYPE.label, color: COLORS.textStrong }}>Edit User</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleRemoveUser}
            activeOpacity={0.78}
            style={styles.iconButton}
          >
            <Trash2 size={20} color={COLORS.textStrong} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        >
          {/* ── User Banner Card ── */}
          <View style={styles.heroBanner}>
            <View style={{ marginRight: 16 }}>
              <Avatar
                uri={beneficiary.avatar || beneficiary.user?.picture_url}
                name={name}
                size="lg"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.uiTitle, color: COLORS.textStrong }} numberOfLines={1}>
                {name}
              </Text>
              {beneficiary.email && (
                <Text style={{ ...TYPE.label, color: COLORS.textWeak, marginTop: 4 }} numberOfLines={1}>
                  {beneficiary.email}
                </Text>
              )}
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textMuted, marginTop: 4 }}>
                {beneficiary.relationship || (isPendingStatus ? 'Invitation pending' : 'Beneficiary')}
              </Text>
            </View>
          </View>

          {/* ── Pending Alert Card ── */}
          {isPendingStatus && (
            <View style={styles.pendingAlertCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <MailWarning size={20} color={COLORS.warning} style={{ marginRight: 10 }} />
                <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
                  Invitation Pending
                </Text>
              </View>
              <Text style={{ ...TYPE.label, color: COLORS.textBase, lineHeight: 20, marginBottom: 16 }}>
                This beneficiary hasn't accepted your invitation yet. They won't receive memories until they join.
              </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                activeOpacity={0.7}
                style={styles.resendButton}
              >
                <MailPlus size={16} color={COLORS.brand} style={{ marginRight: 6 }} />
                <Text style={{ ...TYPE.label, color: COLORS.brand }}>
                  {isResending ? 'Sending...' : 'Resend Invitation'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Details Section ── */}
          <Text style={styles.sectionHeader}>Details</Text>
          
          <View style={{ gap: 16 }}>
            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Beneficiary name</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{name}</Text>
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Email address</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={[styles.fieldValueText, !beneficiary.email && { color: COLORS.textMuted }]}>
                  {beneficiary.email || 'Not provided'}
                </Text>
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Date joined</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValueText}>{createdDate}</Text>
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Relationship</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={[styles.fieldValueText, !beneficiary.relationship && { color: COLORS.textMuted }]}>
                  {beneficiary.relationship || 'Not provided'}
                </Text>
              </View>
            </View>

            {beneficiary.about && (
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>About</Text>
                <View style={[styles.fieldValueContainer, { minHeight: 90, alignItems: 'flex-start' as const, paddingTop: 16 }]}>
                  <Text style={styles.fieldValueText}>{beneficiary.about}</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Groups Section ── */}
          <Text style={[styles.sectionHeader, { marginTop: 32 }]}>Groups</Text>
          
          {beneficiaryGroups.length === 0 ? (
            <Text style={{ ...TYPE.label, color: COLORS.textMuted, marginLeft: 4 }}>
              Not added to any groups.
            </Text>
          ) : (
            <View style={styles.groupPillsContainer}>
              {beneficiaryGroups.map((g: any, idx: number) => {
                const color = GROUP_COLOR_PALETTE[g.color ?? 1]?.color ?? COLORS.info;
                return (
                  <View 
                    key={g._id || idx} 
                    style={[
                      styles.groupPill,
                      { borderColor: color }
                    ]}
                  >
                    <Text style={[styles.groupPillText, { color: color }]}>
                      {g.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: COLORS.fillWeak,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    borderRadius: 24,
  },
  pendingAlertCard: {
    marginTop: 16,
    padding: 20,
    backgroundColor: `${COLORS.warning}0A`, // Very subtle tint of warning gold
    borderWidth: 1,
    borderColor: `${COLORS.warning}33`, 
    borderRadius: 20,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.brand}15`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  sectionHeader: {
    ...TYPE.body,
    color: COLORS.textStrong,
    marginTop: 32,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  fieldBox: {
    gap: 8,
  },
  fieldLabel: {
    ...TYPE.bodySmall,
    color: COLORS.textStrong,
    marginLeft: 4,
  },
  fieldValueContainer: {
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  fieldValueText: {
    ...TYPE.bodyLarge,
    color: COLORS.textStrong,
  },
  groupPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 2,
  },
  groupPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: COLORS.card,
  },
  groupPillText: {
    ...TYPE.label,
  }
});
