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
import { ArrowLeft, Settings } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PlanSummaryBanner } from '@/components/subscription/PlanSummaryBanner';
import { EnrichmentScoreCard } from '@/components/account/EnrichmentScoreCard';
import { WeeklyProgressCard } from '@/components/account/WeeklyProgressCard';
import { AccountSkeleton, Avatar, Button } from '@/components/ui';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  clampEnrichmentScore,
  deriveAccountWeek,
} from '@/features/account/account-overview';
import { useProfile } from '@/hooks/queries/use-profile';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { useUserStats } from '@/hooks/queries/use-overview';
import { useUiStore } from '@/store';

const PATTERN = require('../assets/images/backgrounds/welcome_bg.png');

export default function AccountOverviewScreen() {
  const router = useRouter();
  const openSheet = useUiStore((state) => state.openSheet);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useProfile();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useUserStats();
  const {
    isProOrAbove,
    data: subscription,
    isLoading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useSubscription();

  const displayName = useMemo(
    () => (
      profile?.fullname?.trim()
      || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
      || profile?.nickname
      || 'Your account'
    ),
    [profile],
  );
  const biography = profile?.context?.self_description?.trim() || null;
  const memberSince = useMemo(
    () => (profile?.created_at
      ? `Member since ${dayjs(profile.created_at).format('MMM YYYY')}`
      : null),
    [profile?.created_at],
  );
  const score = clampEnrichmentScore(stats?.enrichment_score);
  const streakCount = Number(profile?.streak) || Number(stats?.streak_count) || 0;
  const weekDays = useMemo(() => deriveAccountWeek(new Date(), streakCount), [streakCount]);
  const isLoading = profileLoading || statsLoading;
  const hasError = profileError || statsError;

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/overview');
  }, [router]);

  const navigateSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const handleSettings = useCallback(() => {
    Haptics.selectionAsync();
    navigateSettings();
  }, [navigateSettings]);

  const handleUpgrade = useCallback(() => {
    router.push('/settings/billing');
  }, [router]);

  const openInsights = useCallback(() => {
    router.push('/insights');
  }, [router]);

  const handleInsights = useCallback(() => {
    Haptics.selectionAsync();
    openInsights();
  }, [openInsights]);

  const openEditProfile = useCallback(() => {
    openSheet('edit-profile');
  }, [openSheet]);

  const handleWeeklyProgress = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('streak');
  }, [openSheet]);

  const handleRefresh = useCallback(async () => {
    Haptics.selectionAsync();
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProfile(),
        refetchStats(),
        refetchSubscription(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProfile, refetchStats, refetchSubscription]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
        <ImageBackground
          source={PATTERN}
          style={{ flex: 1 }}
          imageStyle={{ opacity: 0.03 }}
          resizeMode="repeat"
        >
          <View
            style={{
              minHeight: 62,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.fillWeak,
            }}
          >
            <ArrowLeft size={22} color={COLORS.textBase} strokeWidth={2.2} />
          </TouchableOpacity>

          <Text
            style={{
              position: 'absolute',
              left: 76,
              right: 76,
              textAlign: 'center',
              color: COLORS.textStrong,
              ...TYPE.screenTitle,
            }}
          >
            Account
          </Text>

          <TouchableOpacity
            onPress={handleSettings}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.fillWeak,
            }}
          >
            <Settings size={22} color={COLORS.textBase} strokeWidth={2.2} />
          </TouchableOpacity>
          </View>

          <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.brand}
            />
          )}
        >
          {isLoading ? (
            <AccountSkeleton />
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 24 }}>
              <PlanSummaryBanner
                isProOrAbove={isProOrAbove}
                subscriptionKnown={Boolean(subscription) && !subscriptionLoading}
                onPress={handleUpgrade}
                tier={subscription?.tier}
                status={subscription?.status}
                cancelAtPeriodEnd={subscription?.cancel_at_period_end}
              />

              <Animated.View entering={FadeInDown.delay(160).duration(500)} style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: COLORS.textStrong,
                        ...TYPE.sectionTitle,
                        lineHeight: 29,
                        letterSpacing: -0.5,
                      }}
                    >
                      {displayName}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: COLORS.textStrong,
                        ...TYPE.label,
                        lineHeight: 19,
                      }}
                    >
                      {profile?.email}
                    </Text>
                    {memberSince && (
                      <Text
                        style={{
                          color: COLORS.textWeak,
                          ...TYPE.bodySmall,
                          lineHeight: 18,
                        }}
                      >
                        {memberSince}
                      </Text>
                    )}
                  </View>
                  <Avatar
                    uri={profile?.picture_url || profile?.picture}
                    seed={profile?.email || profile?._id}
                    name={displayName}
                    size="xl"
                    className="h-16 w-16 border-0"
                  />
                </View>

                {biography && (
                  <Text
                    style={{
                      color: COLORS.textStrong,
                      ...TYPE.body,
                      lineHeight: 21,
                    }}
                  >
                    {biography}
                  </Text>
                )}

                {hasError && (
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: COLORS.brandSubtle,
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.textBase,
                        ...TYPE.bodySmall,
                        lineHeight: 19,
                      }}
                    >
                      A little of your account story is still loading. Pull down to try again.
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="h-10 px-4"
                                        onPress={openEditProfile}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="h-10 px-4"
                                        onPress={openInsights}
                  >
                    View Insights
                  </Button>
                </View>
              </Animated.View>

              <EnrichmentScoreCard score={score} onPress={handleInsights} />

              <WeeklyProgressCard
                weekDays={weekDays}
                streakCount={streakCount}
                storiesCount={Number(stats?.stories_count) || 0}
                reflectionsCount={Number(stats?.reflections_count) || 0}
                onPress={handleWeeklyProgress}
              />
            </View>
          )}
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}
