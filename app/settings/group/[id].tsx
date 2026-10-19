import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, ImageBackground, StyleSheet } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import UserRoundPlus from 'lucide-react-native/icons/user-round-plus';
import Settings from 'lucide-react-native/icons/settings';
import Trash2 from 'lucide-react-native/icons/trash';
import FolderHeart from 'lucide-react-native/icons/folder-heart';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';
import { useGroups } from '@/hooks/queries/use-groups';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useRemoveGroupMember } from '@/hooks/mutations/use-group-mutations';
import { COLORS, FONTS } from '@/constants/tokens';
import { Avatar, Skeleton, EmptyState } from '@/components/ui';
import { GROUP_COLOR_PALETTE } from '@/features/beneficiaries/sheet-forms';
import { TYPE } from '@/constants/typography';
import { radius } from '@/constants/responsive';
import { getSettingsHeaderLayout } from '@/features/settings/settings-header-layout';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const layout = getSettingsHeaderLayout();

export default function GroupDetailScreen() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const openSheet = useUiStore((s) => s.openSheet);
  
  const { data: groupsData, isLoading: loadingGroups } = useGroups();
  const { data: beneficiariesData, isLoading: loadingBeneficiaries } = useBeneficiaries();
  
  const { mutate: removeGroupMember } = useRemoveGroupMember();

  // Find the specific group
  const group = useMemo(() => {
    if (!groupsData || !id) return null;
    let list: any[] = [];
    if (Array.isArray(groupsData)) list = groupsData;
    else if (Array.isArray((groupsData as any).docs)) list = (groupsData as any).docs;
    return list.find(g => g._id === id);
  }, [groupsData, id]);

  // Find members of this group
  const members = useMemo(() => {
    if (!beneficiariesData || !id) return [];
    let list: any[] = [];
    if (Array.isArray(beneficiariesData)) list = beneficiariesData;
    else if (Array.isArray((beneficiariesData as any).docs)) list = (beneficiariesData as any).docs;
    
    return list.filter((b) => {
      if (!b.groups || !Array.isArray(b.groups)) return false;
      return b.groups.some((g: any) => g === id || g._id === id);
    });
  }, [beneficiariesData, id]);

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

  const handleRemoveMember = useCallback((memberId: string, memberName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openSheet('security-confirmation', {
      kind: 'remove-member',
      title: 'Remove member?',
      description: `Are you sure you want to remove ${memberName} from this group?`,
      confirmLabel: 'Remove',
      isDestructive: true,
      onConfirm: async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await new Promise<void>((resolve, reject) => {
          // Trigger the mutation to remove the group from this beneficiary
          removeGroupMember(
            { beneficiaryId: memberId, groupId: id },
            {
              onSuccess: () => {
                useUiStore.getState().closeSheet();
                resolve();
              },
              onError: reject,
            }
          );
        });
      }
    });
  }, [id, openSheet, removeGroupMember]);

  if (loadingGroups || loadingBeneficiaries) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View style={styles.header}>
          <View style={styles.backButton}><Skeleton style={{ width: '100%', height: '100%', borderRadius: 22 }} /></View>
        </View>
        <View style={{ paddingVertical: 24, paddingHorizontal: 16, gap: 16 }}>
          <Skeleton style={{ height: 120, width: '100%', borderRadius: 24 }} />
          <Skeleton style={{ height: 80, width: '100%', borderRadius: 24, marginTop: 24 }} />
          <Skeleton style={{ height: 80, width: '100%', borderRadius: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
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
          icon={FolderHeart}
          title="Group not found"
          description="This group may have been removed or no longer exists."
          actionLabel="Back to groups"
          onAction={handleBack}
        />
      </SafeAreaView>
    );
  }

  const swatchColor = GROUP_COLOR_PALETTE[group.color ?? 1]?.color ?? COLORS.info;
  const createdDate = group.created_at 
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(group.created_at))
    : null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.78}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={layout.iconSize} color={COLORS.textBase} />
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handleAddMember}
            activeOpacity={0.78}
            style={styles.actionPill}
          >
            <UserRoundPlus size={16} color={COLORS.textStrong} style={{ marginRight: 6 }} />
            <Text style={{ ...TYPE.label, color: COLORS.textStrong }}>Add member</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleEditGroup}
            activeOpacity={0.78}
            style={styles.iconButton}
          >
            <Settings size={20} color={COLORS.textStrong} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 }}
        >
          {/* ── Hero Banner ── */}
          <View style={[styles.heroBanner, { backgroundColor: swatchColor }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.sectionTitle, color: COLORS.textInverse, marginBottom: 4 }}>
                {group.name}
              </Text>
              {createdDate && (
                <Text style={{ ...TYPE.label, color: 'rgba(255,255,255,0.8)' }}>
                  Created {createdDate}
                </Text>
              )}
            </View>
            <Text style={{ ...TYPE.body, color: COLORS.textInverse }}>
              {members.length} {members.length === 1 ? 'Person' : 'People'}
            </Text>
          </View>

          {/* ── Members List ── */}
          <Text style={{ ...TYPE.body, color: COLORS.textStrong, marginTop: 32, marginBottom: 16, paddingHorizontal: 4 }}>
            Group members
          </Text>

          {members.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ ...TYPE.body, color: COLORS.textWeak }}>
                No members in this group yet.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {members.map(member => {
                const name = member.name || member.email || 'Unknown';
                const statusText = member.status === 'pending' ? 'Pending invite' : (member.relationship || 'Member');
                
                return (
                  <View key={member._id} style={styles.memberCard}>
                    <View style={{ marginRight: 16 }}>
                      <Avatar
                        uri={member.avatar}
                        name={name}
                        size="md"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...TYPE.body, color: COLORS.textStrong }} numberOfLines={1}>
                        {name}
                      </Text>
                      {member.email && (
                        <Text style={{ ...TYPE.label, color: COLORS.textWeak, marginTop: 2 }} numberOfLines={1}>
                          {member.email}
                        </Text>
                      )}
                      <Text style={{ ...TYPE.label, color: COLORS.textMuted, marginTop: 2 }}>
                        {statusText}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveMember(member._id, name)}
                      activeOpacity={0.7}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={20} color={COLORS.error} strokeWidth={1.8} />
                    </TouchableOpacity>
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

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  header: {
    height: layout.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.horizontalPadding,
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderRadius: radius(24),
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: radius(24),
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: COLORS.fillWeaker,
  }
});
