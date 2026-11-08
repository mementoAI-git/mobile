import { useResolvedAppearance, useThemeColors } from '@/hooks/use-theme-colors';
import { useAppearanceStore } from '@/store/appearance.store';
import { COLORS as LIGHT_COLORS } from '@/constants/tokens';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Settings from 'lucide-react-native/icons/settings';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { EnrichmentScoreCard } from '@/components/account/EnrichmentScoreCard';
import { WeeklyProgressCard } from '@/components/account/WeeklyProgressCard';
import { MusicControllerCard } from '@/components/account/MusicControllerCard';
import { AccountSkeleton, Avatar, Button } from '@/components/ui';

import { TYPE } from '@/constants/typography';
import {
  clampEnrichmentScore,
  deriveStreakWeek,
} from '@/features/account/account-overview';
import { useProfile } from '@/hooks/queries/use-profile';
import { useUserStats } from '@/hooks/queries/use-overview';
import { useUiStore } from '@/store';

const PATTERN = require('../assets/images/backgrounds/welcome_bg.png');

export default function AccountOverviewScreen() {
  const COLORS = useThemeColors();
  const appearance = useAppearanceStore((state) => state.preference);
  const resolvedAppearance = useResolvedAppearance();
  // The profile card is a white card on Dark and Deep Sky, with light-mode ink on it.
  const profileOnWhite = appearance === 'deep-sky' || resolvedAppearance === 'dark';
  const profileInk = profileOnWhite ? LIGHT_COLORS : COLORS;
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

  const displayName = useMemo(
    () => (
      profile?.fullname?.trim()
      || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
      || profile?.nickname
      || 'Your account'
    ),
    [profile],
  );
  const memberSince = useMemo(
    () => (profile?.created_at
      ? `Member since ${dayjs(profile.created_at).format('MMM YYYY')}`
      : null),
    [profile?.created_at],
  );
  const score = clampEnrichmentScore(stats?.enrichment_score);
  const streakCount = Number(profile?.streak) || Number(stats?.streak_count) || 0;
  const lastActive = profile?.last_task_date;
  const weekDays = useMemo(() => deriveStreakWeek(new Date(), streakCount, lastActive), [streakCount, lastActive]);
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

  const openInsights = useCallback(() => {
    router.push('/insights');
  }, [router]);

  const handleInsights = useCallback(() => {
    Haptics.selectionAsync();
    openInsights();
  }, [openInsights]);

  // The enrichment card opens Insights on its Enrichment fields tab.
  const openEnrichment = useCallback(() => {
    Haptics.selectionAsync();
    router.push({ pathname: '/insights', params: { section: 'enrichment' } });
  }, [router]);

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
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProfile, refetchStats]);

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
              <Animated.View
                entering={FadeInDown.duration(500)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 20,
                  borderRadius: 20,
                  backgroundColor: profileOnWhite ? LIGHT_COLORS.card : COLORS.fillWeak,
                }}
              >
                <View style={{ flex: 1, gap: 5 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: profileInk.textStrong,
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
                      color: profileInk.textStrong,
                      ...TYPE.label,
                      lineHeight: 19,
                    }}
                  >
                    {profile?.email}
                  </Text>
                  {memberSince && (
                    <Text
                      style={{
                        color: profileInk.textWeak,
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
                  userId={profile?._id} seed={profile?.email}
                  name={displayName}
                  size="xl"
                  className="h-16 w-16 border-0"
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(40).duration(500)}>
                <Button variant="secondary" size="lg" fullWidth className="h-14" onPress={handleInsights}>
                  View insights
                </Button>
              </Animated.View>

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
                    }}
                  >
                    A little of your account story is still loading. Pull down to try again.
                  </Text>
                </View>
              )}

              <Animated.View entering={FadeInDown.delay(80).duration(500)}>
                <MusicControllerCard />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).duration(500)}>
                <WeeklyProgressCard
                  weekDays={weekDays}
                  streakCount={streakCount}
                  storiesCount={Number(stats?.stories_count) || 0}
                  reflectionsCount={Number(stats?.reflections_count) || 0}
                  onPress={handleWeeklyProgress}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(240).duration(500)}>
                <EnrichmentScoreCard score={score} onPress={openEnrichment} />
              </Animated.View>

            </View>
          )}
        </ScrollView>
      </ImageBackground>

    </SafeAreaView>
  );
}
