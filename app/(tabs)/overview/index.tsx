import { isFutureCalendarDay } from '@/features/overview/calendar-selection';
import { OverviewGreeting } from '@/components/overview/OverviewGreeting';
import { OnboardingNudgeBanner } from '@/components/onboarding/OnboardingReminderCard';
import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  RefreshControl,
  StyleSheet,
  ImageBackground,
  Image,
  type LayoutChangeEvent,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Header height before its first layout, so the content starts below it. */
const OVERVIEW_HEADER_HEIGHT = 60;
import { useRouter, useLocalSearchParams } from 'expo-router';
import Plus from 'lucide-react-native/icons/plus';
import Zap from 'lucide-react-native/icons/zap';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useUiStore } from '@/store';
import { useUserStats, useMemoriesStats, useCapsuleStats } from '@/hooks/queries/use-overview';
import { useStories } from '@/hooks/queries/use-memories';
import { useUserStore } from '@/store';
import { DashboardHeader, OverviewSkeleton, JourneyStatIcon } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useProfile } from '@/hooks/queries/use-profile';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { runtimeDiagnostics } from '@/lib/runtime-diagnostics';
import { DailyPromptSection } from '@/components/overview/DailyPromptSection';
import { useCalendarStories } from '@/hooks/queries/use-calendar-stories';
import { storyDaysInMonth } from '@/features/overview/story-calendar';
import { BrowseTopicsSection } from '@/components/overview/BrowseTopicsSection';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useSharedValue, useAnimatedStyle, withSpring,
  useAnimatedScrollHandler, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { OverviewCaptureCard } from '@/components/overview/OverviewCaptureCard';
import { EnrichmentSummaryCard } from '@/components/overview/EnrichmentSummaryCard';
import { CalendarCard } from '@/components/overview/CalendarCard';
import { useVoiceScroll } from '@/features/voice-control/hooks';

const WELCOME_BG = require('../../../assets/images/backgrounds/welcome_bg.png');





/** All memories / Beneficiaries / Streak count cards are hidden on Overview for now. */
const SHOW_JOURNEY_STATS = false;

interface OverviewJourneyCardProps {
  label: string;
  valueElement: React.ReactNode;
  icon: any;
  onPress?: () => void;
}

const OverviewJourneyCard = React.memo(function OverviewJourneyCard({
  label,
  valueElement,
  icon,
  onPress,
}: OverviewJourneyCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // useCallback so these stable handlers don't re-create on every parent render
  const handlePressIn = useCallback(() => {
    if (onPress) scale.value = withSpring(0.98);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    if (onPress) scale.value = withSpring(1);
  }, [onPress, scale]);

  const content = (
    <View className="flex-row items-center justify-between p-5 flex-1">
      <View className="gap-3 flex-1">
        <Text
          className="uppercase tracking-widest text-text-weak"
          style={TYPE.eyebrow}
        >
          {label}
        </Text>
        <View className="flex-row items-baseline gap-1.5 flex-wrap">
          {valueElement}
        </View>
      </View>
      <View className="ml-3 shrink-0">
        {typeof icon === 'number' || (icon && typeof icon === 'object' && 'uri' in icon) ? (
          <Image
            source={icon}
            style={{ width: 60, height: 60 }}
            resizeMode="contain"
          />
        ) : typeof icon === 'string' ? (
          <Text className="" style={TYPE.screenTitle}>{icon}</Text>
        ) : (
          icon
        )}
      </View>
    </View>
  );

  return (
    <Animated.View style={[animatedStyle]}>
      <TouchableOpacity
        onPress={() => {
          if (onPress) {
            Haptics.selectionAsync();
            onPress();
          }
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        className="w-full min-h-[96px] rounded-[20px] border border-stroke-weak bg-fill-weak flex-row items-center justify-between overflow-hidden"
      >
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────


export default function OverviewScreen() {
  const COLORS = useThemeColors();
  React.useEffect(() => {
    runtimeDiagnostics.record('screen', 'mount', { screen: 'overview' });
    return () => runtimeDiagnostics.record('screen', 'unmount', { screen: 'overview' });
  }, []);
  const router = useRouter();
  const openSheet = useUiStore((s) => s.openSheet);
  const user = useUserStore((s) => s.user);

  const openStreakSheet = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('streak');
  }, [openSheet]);

  const handleGoToStories = useCallback(() => router.push('/(tabs)/stories'), [router]);
  const handleGoToSettings = useCallback(() => router.push('/settings'), [router]);
  const handleAddStory = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/editor', params: { mode: 'story' } });
  }, [router]);
  const handleQuickCapture = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/editor', params: { mode: 'quick-capture' } });
  }, [router]);
  const handleViewInsights = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights');
  }, [router]);

  // ── Scroll tracking ───────────────────────────────────────────────────────
  const scrollY = useSharedValue(0);
  // Lets voice scroll this screen ("scroll down", "go to the top").
  const voiceScrollRef = useVoiceScroll<Animated.ScrollView>();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // FAB fades in promptly as soon as user begins scrolling down
  const fabStyle = useAnimatedStyle(() => {
    const isVisible = scrollY.value > 100;
    const progress = interpolate(scrollY.value, [20, 80], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: progress,
      transform: [{ scale: interpolate(progress, [0, 1], [0.7, 1], Extrapolation.CLAMP) }],
      display: isVisible ? 'flex' : 'none',
    };
  });

  // Track manual pull-to-refresh separately from background refetches.
  // isRefetching from TanStack Query is true for ALL background refetches
  // (focus refetch, interval, stale, etc.) — using it directly for RefreshControl
  // causes the spinner to appear and layout to shift every 30s or on tab focus.
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Data fetching
  const queryClient = useQueryClient();
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();

  useEffect(() => {
    if (checkout === 'success') {
      openSheet('upgrade-success');
      router.setParams({ checkout: undefined });
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
    }
  }, [checkout, openSheet, queryClient, router]);

  // Data fetching
  const { data: profile } = useProfile();
  const { data: statsData, refetch: refetchStats, isLoading: statsLoading } = useUserStats();
  const { data: memoriesStats, refetch: refetchMemories, isLoading: memoriesLoading } = useMemoriesStats();
  const { data: capsuleStats, refetch: refetchCapsule, isLoading: capsuleLoading } = useCapsuleStats();
  // Stories power one client fallback only: the weekly count when stats
  // lack it. When stats cover it, skip the 50-doc fetch on launch entirely.
  const needsStories =
    statsData?.week_count == null && (statsData as any)?.weekly_count == null;
  const { data: recentStoriesData } = useStories({ limit: 50 }, { enabled: needsStories });

  // Manual pull-to-refresh: invalidate all caches to trigger global background updates
  const handleManualRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.memoriesStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.capsuleStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dailyPrompts() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.overviewPrompts }),
        queryClient.invalidateQueries({ queryKey: queryKeys.activities }),
        queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries }),
      ]);
    } finally {
      setManualRefreshing(false);
    }
  }, [queryClient]);

  // Client-side fallback to count stories created this week from recent stories
  const clientWeeklyStories = useMemo(() => {
    const stories = recentStoriesData?.pages?.flatMap((p) => p?.docs ?? []) ?? [];
    if (!stories.length) return 0;

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    return stories.filter((s) => {
      if (!s?.created_at) return false;
      const createdAt = new Date(s.created_at);
      return createdAt >= startOfWeek;
    }).length;
  }, [recentStoriesData]);

  const stats = statsData ?? {};
  const streakCount = Number(user?.streak) || Number(stats.streak_count) || 0;
  const rawEnrichmentScore = Number(stats.enrichment_score);
  const enrichmentScore = statsData && Number.isFinite(rawEnrichmentScore) ? rawEnrichmentScore : undefined;
  const memoriesCount = memoriesStats?.stories_count ?? 0;
  const weeklyMemories =
    Number(memoriesStats?.week_count ?? memoriesStats?.weekly_count) ||
    clientWeeklyStories;
  // Beneficiaries count comes from userStats (same source
  // use-overview-logic trusts) so launch skips the full-pagination
  // beneficiaries walk entirely.
  const beneficiariesCount =
    Number((statsData as any)?.beneficiaries_count) || 0;
  const capsuleCount = capsuleStats?.scheduled_count || 0;
  const quickPending = Number(stats.quick_capture_pending_count) || 0;

  const displayName = user?.nickname || user?.first_name || user?.last_name || '';
  const isLoading = statsLoading || memoriesLoading || capsuleLoading;

  // ── Dynamic Calendar & Streak State ────────────────────────────────────────
  const { data: calendarStories = [] } = useCalendarStories();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  const handlePrevMonth = useCallback(() => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedCalendarDay(null);
  }, []);

  const handleNextMonth = useCallback(() => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedCalendarDay(null);
  }, []);

  const selectCalendarDate = useCallback((date: Date) => {
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedCalendarDay(date.getDate());
  }, []);
  const handleResetMonth = useCallback(() => {
    openSheet('calendar-date', { date: calendarMonth, onSelect: selectCalendarDate });
  }, [openSheet, calendarMonth, selectCalendarDate]);
  const handleCalendarDayPress = useCallback((day: number) => {
    if (isFutureCalendarDay(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day))) return;
    setSelectedCalendarDay(day);
    openSheet('calendar-stories', { date: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) });
  }, [openSheet, calendarMonth]);

  // Live formatted time for calendar card
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30_000);
    return () => clearInterval(interval);
  }, []);

  const [headerHeight, setHeaderHeight] = useState(OVERVIEW_HEADER_HEIGHT);
  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    setHeaderHeight((previous) => (previous === next ? previous : next));
  }, []);
  const calendarStreakDays = useMemo(() => storyDaysInMonth(calendarStories, calendarMonth), [calendarStories, calendarMonth]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Floats over the content, which scrolls up beneath its frosted fade. */}
      <DashboardHeader
        compactTitle
        floating
        title="Overview"
        onStreakPress={openStreakSheet}
        onLayout={handleHeaderLayout}
      />

      {isLoading && !manualRefreshing ? (
        <View style={{ flex: 1, paddingTop: headerHeight }}>
          <OverviewSkeleton />
        </View>
      ) : (
        <>
          <Animated.ScrollView
            ref={voiceScrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerClassName="px-4 pb-32 gap-10"
            contentContainerStyle={{ paddingTop: headerHeight + 24 }}
            onScroll={scrollHandler}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl refreshing={manualRefreshing} onRefresh={handleManualRefresh} tintColor={COLORS.brand} />
            }
          >
            <View className="gap-10">
              {/* Greeting — `variant="editorial"` restores web's sun/moon + serif line. */}
              <OverviewGreeting name={displayName} />

              <OnboardingNudgeBanner />

              <Animated.View entering={FadeInDown.delay(100)}>
                <OverviewCaptureCard key={user?._id ?? 'guest'} userId={user?._id} onAddStory={handleAddStory} />
              </Animated.View>

              {/* ── Quick-Capture Status ─────────────────────────────── */}
              {quickPending > 0 && (
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/stories')}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-3 bg-brand/5 rounded-2xl p-4"
                >
                  <View className="size-8 bg-brand rounded-full items-center justify-center">
                    <Zap size={14} color={COLORS.textInverse} fill="white" />
                  </View>
                  <Animated.Text className="text-text-strong flex-1" style={TYPE.label}>
                    <Animated.Text className="text-brand" style={TYPE.label}>{quickPending}</Animated.Text> quick capture{quickPending > 1 ? 's' : ''} finishing up...
                  </Animated.Text>
                  <ChevronRight size={16} color={COLORS.brand} />
                </TouchableOpacity>
              )}
            </View>

            <DailyPromptSection />

            {/* ── Interactive Spline Chart ────────────────────────── */}
            {/* <Animated.View entering={FadeInDown.delay(250)}>
            <SplineChart />
          </Animated.View> */}
            {/* Hidden — story trends not tracking meaningful data yet. Restore when data is reliable. */}

            {/* ── Stat Column (Web Parity Stack) ── hidden for now; flip SHOW_JOURNEY_STATS to restore. */}
            {SHOW_JOURNEY_STATS ? (
            <View className="gap-3">
              {/* <View className="px-1">
                <Text className="text-text-strong" style={TYPE.sectionTitle}>Your Journey</Text>
              </View> */}

              <OverviewJourneyCard
                label="ALL MEMORIES"
                valueElement={
                  <View className="flex-row items-baseline gap-2">
                    <View className="flex-row items-baseline">
                      <Text className="text-info-strong" style={TYPE.stat}>{memoriesCount}</Text>
                      <Text className="text-text-strong ml-1" style={TYPE.body}>items</Text>
                    </View>
                    <Text style={[TYPE.body, { color: COLORS.success }]}>
                      +{weeklyMemories} this week
                    </Text>
                  </View>
                }
                icon={<JourneyStatIcon type="memories" />}
                onPress={handleGoToStories}
              />

              <OverviewJourneyCard
                label="BENEFICIARIES"
                valueElement={
                  <>
                    <Text className="text-brand" style={TYPE.stat}>{beneficiariesCount}</Text>
                    <Text className="text-text-strong ml-1" style={TYPE.body}>people</Text>
                  </>
                }
                icon={<JourneyStatIcon type="beneficiaries" />}
                onPress={handleGoToSettings}
              />

              <OverviewJourneyCard
                label="STREAK COUNT"
                valueElement={
                  <>
                    <Text className="text-brand" style={TYPE.stat}>{streakCount}</Text>
                    <Text className="text-text-strong ml-1" style={TYPE.body}>day streak</Text>
                  </>
                }
                icon={<JourneyStatIcon type="streak" />}
              />
            </View>
            ) : null}

            {/* ── Enrichment score (web chat-settings summary layout) ── */}
            <Animated.View entering={FadeInDown.delay(200)}>
              <EnrichmentSummaryCard score={enrichmentScore} onViewInsight={handleViewInsights} />
            </Animated.View>

            <CalendarCard
              month={calendarMonth}
              selectedDate={selectedCalendarDay}
              eventDates={calendarStreakDays}
              time={currentTime}
              onPreviousMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onMonthPress={handleResetMonth}
              onDatePress={handleCalendarDayPress}
              onTimePress={openStreakSheet}
            />

            {/* ── Browse Topics (Horizontal Scroll) ─────────────────── */}
            <BrowseTopicsSection />

          </Animated.ScrollView>

          {/* Floating + FAB — appears when "Add story" scrolls off screen */}
          <Animated.View
            style={[fabStyle, {
              position: 'absolute',
              bottom: 96,
              right: 24,
              zIndex: 50,
            }]}
          >
            <TouchableOpacity
              onPress={handleAddStory}
              activeOpacity={0.85}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: COLORS.brand,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: COLORS.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Plus size={26} color={COLORS.textInverse} strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
