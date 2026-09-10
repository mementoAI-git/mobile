import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FolderPlus, UserRoundPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button, Skeleton } from '@/components/ui';
import { BeneficiaryEmptyState } from '@/components/beneficiaries/BeneficiaryEmptyState';
import { BeneficiaryGroupRow } from '@/components/beneficiaries/BeneficiaryGroupRow';
import { BeneficiaryPersonRow } from '@/components/beneficiaries/BeneficiaryPersonRow';
import { useBeneficiariesSettingsLogic } from '@/hooks/use-beneficiaries-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  filterBeneficiaries,
  type BeneficiaryFilterTab,
} from '@/features/beneficiaries/vault-permissions';
import type { IBeneficiary, IGroup } from '@/types';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
type BeneficiaryTab = 'people' | 'groups';

function CollectionSkeleton() {
  return (
    <View className="gap-3 px-6 pt-6">
      {[1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-24 w-full rounded-[24px]" />
      ))}
    </View>
  );
}

function CountTab({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      className={`min-h-12 flex-row items-center rounded-2xl px-4 ${active ? 'bg-text-strong' : 'bg-fill-weak'}`}
    >
      <Text
        className={active ? 'text-white' : 'text-text-strong'}
        style={TYPE.button}
      >
        {label}
      </Text>
      <View className={`ml-3 min-w-8 items-center rounded-full px-2 py-1 ${active ? 'bg-white/15' : 'bg-fill-weak'}`}>
        <Text
          className={active ? 'text-white' : 'text-text-weak'}
          style={TYPE.bodySmall}
        >
          {count > 9 ? '9+' : count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BeneficiariesSettingsScreen() {
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
  const [tab, setTab] = useState<BeneficiaryTab>('people');
  const [filterTab, setFilterTab] = useState<BeneficiaryFilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredBeneficiaries = useMemo(
    () => filterBeneficiaries(beneficiaries, filterTab),
    [beneficiaries, filterTab]
  );

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const selectTab = useCallback((nextTab: BeneficiaryTab) => {
    Haptics.selectionAsync();
    setTab(nextTab);
  }, []);

  const invite = useCallback(() => {
    openSheet('add-beneficiary');
  }, [openSheet]);

  const createGroup = useCallback(() => {
    openSheet('create-group');
  }, [openSheet]);

  const showPerson = useCallback((beneficiary: IBeneficiary) => {
    openSheet('beneficiary-actions', {
      beneficiary,
      onResend: handleResend,
      onRemove: handleRemove,
    });
  }, [handleRemove, handleResend, openSheet]);

  const editGroup = useCallback((group: IGroup) => {
    openSheet('create-group', { editData: group });
  }, [openSheet]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const hasItems = tab === 'people' ? beneficiaries.length > 0 : groups.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="h-[88px] flex-row items-center justify-between px-6">
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.78}
          className="size-11 items-center justify-center rounded-full bg-fill-weak"
        >
          <ArrowLeft size={23} color={COLORS.textBase} />
        </TouchableOpacity>
        <Text style={TYPE.screenTitle}>
          Beneficiaries
        </Text>
        <View className="size-11" />
      </View>

      <View className="px-6 pb-5 pt-6">
        <Text style={TYPE.sectionTitle}>
          Beneficiaries and groups
        </Text>
        <Text className="mt-3" style={TYPE.body}>
          Invite the people who matter most. They’ll be able to receive your memories and interact with your Memento Agent.
        </Text>
        <View className="mt-7 flex-row gap-3">
          <CountTab label="People" count={beneficiaries.length} active={tab === 'people'} onPress={() => selectTab('people')} />
          <CountTab label="Groups" count={groups.length} active={tab === 'groups'} onPress={() => selectTab('groups')} />
        </View>
      </View>

      <View className="h-px bg-stroke-weaker" />
      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />
        {isLoading ? (
          <CollectionSkeleton />
        ) : isError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center" style={TYPE.cardTitle}>
              Your trusted circle needs a refresh
            </Text>
            <Text className="mt-2 text-center" style={TYPE.body}>
              We couldn’t load these details right now.
            </Text>
            <Button onPress={refresh} size="lg" className="mt-5 h-14 px-9">Try again</Button>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.brand} />}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48 }}
          >
            {!hasItems ? (
              <BeneficiaryEmptyState mode={tab} onAction={tab === 'people' ? invite : createGroup} />
            ) : (
              <View className="gap-3">
                {tab === 'people' && beneficiaries.length > 0 && (
                  <View className="mb-2 flex-row gap-2">
                    {(['all', 'active', 'pending'] as const).map((subTab) => (
                      <TouchableOpacity
                        key={subTab}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setFilterTab(subTab);
                        }}
                        activeOpacity={0.7}
                        className={`rounded-full border px-4 py-2 ${
                          filterTab === subTab
                            ? 'border-brand bg-brand/10'
                            : 'border-stroke-weaker bg-fill-weaker'
                        }`}
                      >
                        <Text
                          style={{
                            ...TYPE.metadata,
                            color: filterTab === subTab ? COLORS.brand : COLORS.textWeak,
                            textTransform: 'capitalize',
                          }}
                        >
                          {subTab}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {tab === 'people'
                  ? filteredBeneficiaries.map((beneficiary: IBeneficiary) => (
                    <BeneficiaryPersonRow
                      key={beneficiary._id ?? beneficiary.email}
                      beneficiary={beneficiary}
                      onPress={() => router.push(`/settings/beneficiary/${beneficiary._id ?? beneficiary.email}` as any)}
                    />
                  ))
                  : groups.map((group, index) => (
                    <BeneficiaryGroupRow
                      key={group._id}
                      group={group}
                      index={index}
                      onPress={() => router.push(`/settings/group/${group._id}` as any)}
                    />
                  ))}
                <Button
                  variant="secondary"
                  size="lg"
                  className="mt-2 h-14"
                  leftIcon={tab === 'people'
                    ? <UserRoundPlus size={21} color={COLORS.textStrong} />
                    : <FolderPlus size={21} color={COLORS.textStrong} />}
                  onPress={tab === 'people' ? invite : createGroup}
                >
                  {tab === 'people' ? 'Invite new Beneficiary' : 'Create New Group'}
                </Button>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
