import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import FolderPlus from 'lucide-react-native/icons/folder-plus';
import UserPlus from 'lucide-react-native/icons/user-plus';
import * as Haptics from 'expo-haptics';
import { Button, ResponsiveScreen, Skeleton } from '@/components/ui';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import { BeneficiaryEmptyState } from '@/components/beneficiaries/BeneficiaryEmptyState';
import { BeneficiaryGroupRow } from '@/components/beneficiaries/BeneficiaryGroupRow';
import { BeneficiaryPersonRow } from '@/components/beneficiaries/BeneficiaryPersonRow';
import { useBeneficiariesSettingsLogic } from '@/hooks/use-beneficiaries-settings-logic';
import { TYPE } from '@/constants/typography';
import type { IBeneficiary } from '@/types';

type PeopleTab = 'people' | 'groups';
const TABS: { key: PeopleTab; label: string }[] = [
  { key: 'people', label: 'People' },
  { key: 'groups', label: 'Groups' },
];

/** Mirrors web settings "People & groups" (beneficiary&group/index.tsx), with native sheets. */
export default function PeopleAndGroupsScreen() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const {
    beneficiaries,
    groups,
    isLoading,
    isError,
    refetch,
    handleRemove,
    handleResend,
    openSheet,
    router,
  } = useBeneficiariesSettingsLogic();
  const [tab, setTab] = useState<PeopleTab>('people');
  const [refreshing, setRefreshing] = useState(false);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const selectTab = useCallback((next: PeopleTab) => {
    Haptics.selectionAsync();
    setTab(next);
  }, []);

  const invite = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('add-beneficiary');
  }, [openSheet]);

  const createGroup = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('create-group');
  }, [openSheet]);

  const showPersonOptions = useCallback((beneficiary: IBeneficiary) => {
    Haptics.selectionAsync();
    openSheet('beneficiary-actions', {
      beneficiary,
      onResend: handleResend,
      onRemove: handleRemove,
    });
  }, [handleRemove, handleResend, openSheet]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Same layout as Security: a full-width header, then the page column. */}
      <SettingsSubpageHeader title="People &" accent="groups" onBack={handleBack} />

      <View className="flex-1">
        <ResponsiveScreen maxWidth={720}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.brand} />}
            contentContainerStyle={styles.content}
          >
            <View style={styles.toolbar}>
              <View style={styles.tabs} accessibilityRole="tablist">
                {TABS.map((item) => {
                  const selected = tab === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => selectTab(item.key)}
                      activeOpacity={0.78}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      style={[styles.tab, selected && styles.activeTab]}
                    >
                      <Text style={[styles.tabText, selected && styles.activeTabText]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Button
                variant="secondary"
                rounded="full"
                className="h-11 px-4"
                leftIcon={tab === 'people'
                  ? <UserPlus size={20} color={COLORS.textStrong} />
                  : <FolderPlus size={20} color={COLORS.textStrong} />}
                onPress={tab === 'people' ? invite : createGroup}
              >
                {tab === 'people' ? 'Invite person' : 'New group'}
              </Button>
            </View>

            <View style={styles.list}>
              {isLoading ? (
                [0, 1].map((key) => (
                  <Skeleton key={key} className="h-[96px] w-full rounded-[20px]" />
                ))
              ) : isError ? (
                <>
                  <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>
                    {tab === 'people'
                      ? 'We couldn’t load your people. Please try again.'
                      : 'We couldn’t load your groups. Please try again.'}
                  </Text>
                  <Button variant="outline" rounded="full" className="h-11 self-start px-5" onPress={refresh}>
                    Try again
                  </Button>
                </>
              ) : tab === 'people' ? (
                beneficiaries.length === 0 ? (
                  <BeneficiaryEmptyState mode="people" />
                ) : (
                  beneficiaries.map((beneficiary: IBeneficiary) => (
                    <BeneficiaryPersonRow
                      key={beneficiary._id ?? beneficiary.email}
                      beneficiary={beneficiary}
                      onOptions={() => showPersonOptions(beneficiary)}
                    />
                  ))
                )
              ) : groups.length === 0 ? (
                <BeneficiaryEmptyState mode="groups" />
              ) : (
                groups.map((group) => (
                  <BeneficiaryGroupRow
                    key={group._id}
                    group={group}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(`/settings/group/${group._id}` as any);
                    }}
                  />
                ))
              )}
            </View>
          </ScrollView>
        </ResponsiveScreen>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Security's spacing: content starts 16px below the header; the section
  // header (tabs + action) sits 24px above its rows.
  content: { paddingTop: 16, paddingBottom: 48 },
  toolbar: {
    marginBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  // Same tab pills as Insights (web .insights-tabs).
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.strokeWeak,
  },
  activeTab: { backgroundColor: colors.activeFill, borderColor: 'transparent' },
  tabText: { color: colors.textBase, ...TYPE.label },
  activeTabText: { color: colors.activeText },
  list: { gap: 16 },
});
