import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Zap, Trophy, ChevronRight,  BarChart2 } from 'lucide-react-native';
import { useUiStore } from '@/store';
import { useUserStats, useMemoriesStats, useCapsuleStats } from '@/hooks/queries/use-overview';
import { useUserStore } from '@/store';
import { DashboardHeader, OverviewSkeleton, GradientText, GreetingIcon, JourneyStatIcon, Button } from '@/components/ui';
import { UiLightning01 } from '@/components/ui/icons/SettingsIcons';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useProfile } from '@/hooks/queries/use-profile';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { runtimeDiagnostics } from '@/lib/runtime-diagnostics';
import { DailyPromptSection } from '@/components/overview/DailyPromptSection';
import { RecentActivitiesSection } from '@/components/overview/RecentActivitiesSection';
import { BrowseTopicsSection } from '@/components/overview/BrowseTopicsSection';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useSharedValue, useAnimatedStyle, withSpring,
  useAnimatedScrollHandler, interpolate, Extrapolation,
} from 'react-native-reanimated';

const WELCOME_BG = require('../../../assets/images/backgrounds/welcome_bg.png');
const ENRICHMENT_BG = require('../../../assets/images/backgrounds/enrichment_bg.png');
const MEMORIES_BG = require('../../../assets/images/backgrounds/dash_memories_card.png');
const BENEFI_BG = require('../../../assets/images/backgrounds/dash_benefi_card.png');
const CAPSULE_BG = require('../../../assets/images/backgrounds/dash_time_cap_card.png');
const STREAK_BG = require('../../../assets/images/backgrounds/side_cards_for_streak.png');





interface OverviewJourneyCardProps {
  label: string;
  valueElement: React.ReactNode;
  icon: any;
  onPress?: () => void;
  bgColor?: string;
  borderColor?: string;
  bgImage?: any;
}

const OverviewJourneyCard = React.memo(function OverviewJourneyCard({
  label,
  valueElement,
  icon,
  onPress,
  bgColor = 'bg-white',
  borderColor = 'border-stroke-weaker',
  bgImage
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
      <View className="gap-1 flex-1">
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
            style={{ width: 44, height: 44 }}
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
        className={`w-full rounded-2xl border ${borderColor} ${bgColor} flex-row items-center justify-between overflow-hidden`}
      >
        {bgImage ? (
          <ImageBackground
            source={bgImage}
            className="w-full flex-row"
            imageStyle={{ borderRadius: 24 }}
            resizeMode="cover"
          >
            {content}
          </ImageBackground>
        ) : (
          content
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 7) return "Up early today,";
  if (hour >= 7 && hour < 12) return "Good morning,";
  if (hour >= 12 && hour < 17) return "Good afternoon,";
  if (hour >= 17 && hour < 21) return "Good evening,";
  if (hour >= 21) return "Night owl mode,";
  return "Still going,";
}

export default function OverviewScreen() {
  React.useEffect(() => {
    runtimeDiagnostics.record('screen', 'mount', { screen: 'overview' });
    return () => runtimeDiagnostics.record('screen', 'unmount', { screen: 'overview' });
  }, []);
  const router = useRouter();
  const openSheet = useUiStore((s) => s.openSheet);
  const user = useUserStore((s) => s.user);
  const greeting = useMemo(() => getGreeting(), []);
  // useBright computed once at mount — hour doesn't change meaningfully during a session
  const useBright = useMemo(() => {
    const h = new Date().getHours();
    return h >= 6 && h < 17;
  }, []);

  const openStreakSheet = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('streak');
  }, [openSheet]);

  const handleGoToStories     = useCallback(() => router.push('/(tabs)/stories'),   [router]);
  const handleGoToSettings    = useCallback(() => router.push('/settings'),           [router]);
  const handleAddStory        = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/editor', params: { mode: 'story' } });
  }, [router]);
  const handleQuickCapture    = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/editor', params: { mode: 'quick-capture' } });
  }, [router]);
  const handleViewInsights    = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights');
  }, [router]);

  // ── Scroll tracking ───────────────────────────────────────────────────────
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // FAB fades in only after the hero card (~320px tall) has fully scrolled off screen
  const fabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [300, 400], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.value, [300, 400], [0.7, 1], Extrapolation.CLAMP) }],
  }));

  // Track manual pull-to-refresh separately from background refetches.
  // isRefetching from TanStack Query is true for ALL background refetches
  // (focus refetch, interval, stale, etc.) — using it directly for RefreshControl
  // causes the spinner to appear and layout to shift every 30s or on tab focus.
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Data fetching
  const queryClient = useQueryClient();

  // Data fetching
  const { data: profile } = useProfile();
  const { data: statsData, refetch: refetchStats, isLoading: statsLoading } = useUserStats();
  const { data: memoriesStats, refetch: refetchMemories, isLoading: memoriesLoading } = useMemoriesStats();
  const { data: capsuleStats, refetch: refetchCapsule, isLoading: capsuleLoading } = useCapsuleStats();
  const { data: beneficiariesRaw } = useBeneficiaries();

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



  const stats = statsData ?? {};
  const streakCount = Number(user?.streak) || Number(stats.streak_count) || 0;
  const enrichmentScore = Number(stats.enrichment_score) || 0;
  const memoriesCount = memoriesStats?.stories_count ?? 0;
  const weeklyMemories = memoriesStats?.week_count ?? 0;
  // Use actual beneficiaries list count — matches web which calls endpoint.beneficiaries directly
  const beneficiariesCount = (() => {
    if (!beneficiariesRaw) return 0;
    if ((beneficiariesRaw as any)?.totalDocs != null) return Number((beneficiariesRaw as any).totalDocs);
    if (Array.isArray(beneficiariesRaw)) return beneficiariesRaw.length;
    if ((beneficiariesRaw as any)?.docs) return ((beneficiariesRaw as any).docs as any[]).length;
    return 0;
  })();
  const capsuleCount = capsuleStats?.scheduled_count || 0;
  const quickPending = Number(stats.quick_capture_pending_count) || 0;

  const displayName = user?.nickname || user?.first_name || user?.last_name || '';
  const isLoading = statsLoading || memoriesLoading || capsuleLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <DashboardHeader
        title="Overview"
        onStreakPress={openStreakSheet}
      />

      {isLoading && !manualRefreshing ? (
        <OverviewSkeleton />
      ) : (
        <>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pt-6 pb-32 gap-8"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={manualRefreshing} onRefresh={handleManualRefresh} tintColor={COLORS.brand} />
          }
        >
          {/* ── Editorial Greeting ────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(600)} className="flex-row items-start gap-4">
            <GreetingIcon type={useBright ? 'sun' : 'moon'} size={40} />
            <View className="flex-1">
              <Animated.Text
                className="text-text-strong"
                style={TYPE.greeting}
              >
                {greeting}
                {displayName && (
                  <Animated.Text style={{ ...TYPE.greeting, color: COLORS.success }}> {displayName}.</Animated.Text>
                )}
              </Animated.Text>
            </View>
          </Animated.View>

          {/* ── Quick-Capture Status ─────────────────────────────── */}
          {quickPending > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/stories')}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 bg-brand/5 rounded-2xl p-4"
            >
              <View className="size-8 bg-brand rounded-full items-center justify-center">
                <Zap size={14} color="white" fill="white" />
              </View>
              <Animated.Text className="text-text-strong flex-1" style={TYPE.label}>
                <Animated.Text className="text-brand" style={TYPE.label}>{quickPending}</Animated.Text> quick capture{quickPending > 1 ? 's' : ''} finishing up...
              </Animated.Text>
              <ChevronRight size={16} color={COLORS.brand} />
            </TouchableOpacity>
          )}

          {/* ── Two-Card Hero Section ─────────────────────────────── */}
          <View className="gap-6">
            {/* Card 1: Primary Action Hero */}
            <Animated.View entering={FadeInDown.delay(100)}>
              <ImageBackground
                source={WELCOME_BG}
                className="rounded-2xl overflow-hidden bg-white"
                imageStyle={{ borderRadius: 16 }}
              >
                <View className="p-7 gap-8" style={{ borderRadius: 16 }}>
                  <View className="flex-row items-start justify-between">
                      <Text
                        className="text-text-strong flex-1"
                        style={TYPE.bodyLarge}
                      >
                      What's on your{"\n"}mind today?
                    </Text>
                    <TouchableOpacity
                      onPress={openStreakSheet}
                      activeOpacity={0.8}
                      className="flex-row items-center gap-3 bg-white/90 px-3.5 py-2 rounded-full border border-white/30"
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Zap size={14} color={COLORS.brand} fill={COLORS.brand} />
                        <Text className="text-text-strong" style={TYPE.buttonSmall}>{streakCount}</Text>
                      </View>
                      <View className="w-px h-3 bg-stroke-weaker" />
                      <View className="flex-row items-center gap-1.5">
                        <Trophy size={14} color={COLORS.warning} />
                        <Text className="text-text-strong" style={TYPE.buttonSmall}>{enrichmentScore}%</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <Button
                      onPress={handleAddStory}
                      size="lg"
                      variant="primary"
                      className="flex-[1.5]"
                      leftIcon={<Plus size={20} color={COLORS.textInverse} strokeWidth={3} />}
                    >
                      Add story
                    </Button>

                    <Button
                      onPress={handleQuickCapture}
                      size="lg"
                      variant="secondary"
                      className="flex-1 bg-white border-0 shadow-none"
                      leftIcon={<UiLightning01 size={20} color={COLORS.textBase} strokeWidth={2} />}
                    >
                      Quick capture
                    </Button>
                  </View>
                </View>
              </ImageBackground>
            </Animated.View>

            {/* ── Daily Prompts ─────────────────────────────────────── */}
            <DailyPromptSection />

            {/* Card 2: Enrichment Hero */}
            <Animated.View entering={FadeInDown.delay(200)}>
              <ImageBackground
                source={ENRICHMENT_BG}
                className="rounded-2xl overflow-hidden bg-white"
                imageStyle={{ borderRadius: 16 }}
              >
                <View className="p-7 gap-5" style={{ borderRadius: 16 }}>
                  <View className="flex-row items-center gap-4">
                    <GradientText
                      colors={['#5B9BD5', '#A8D4F5']}
                      style={TYPE.displayStat}
                    >
                      {enrichmentScore}%
                    </GradientText>
                    <View className="bg-white/80 px-3 py-1.5 rounded-full border border-white/30">
                      <Text className="text-text-strong uppercase tracking-widest" style={TYPE.eyebrow}>
                        Enrichment score
                      </Text>
                    </View>
                  </View>
                  <Text className="text-text-weak" style={TYPE.body}>
                    Share stories & files to build context. Link apps to enrich your Memento.
                  </Text>
                  <TouchableOpacity
                    onPress={handleViewInsights}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      height: 40,
                      borderRadius: 999,
                      backgroundColor: COLORS.fillWeaker,
                      paddingHorizontal: 16,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <BarChart2 size={15} color={COLORS.textWeak} strokeWidth={1.5} />
                    <Text style={{ ...TYPE.buttonSmall, color: COLORS.textStrong }}>View insights</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </Animated.View>
          </View>

          {/* ── Interactive Spline Chart ────────────────────────── */}
          {/* <Animated.View entering={FadeInDown.delay(250)}>
            <SplineChart />
          </Animated.View> */}
          {/* Hidden — story trends not tracking meaningful data yet. Restore when data is reliable. */}

          {/* ── Stat Column (Web Parity Stack) ────────────────────────── */}
          <View className="gap-4">
            <View className="px-1">
              <Text className="text-text-strong" style={TYPE.sectionTitle}>Your Journey</Text>
            </View>

            <OverviewJourneyCard
              label="ALL MEMORIES"
              valueElement={
                <View className="gap-0.5">
                  <View className="flex-row items-baseline">
                    <Text className="text-info-strong" style={TYPE.stat}>{memoriesCount}</Text>
                    <Text className="text-text-strong ml-1" style={TYPE.button}>items</Text>
                  </View>
                  {weeklyMemories > 0 && (
                    <Text className="text-text-weak" style={TYPE.metadata}>
                      +{weeklyMemories} this week
                    </Text>
                  )}
                </View>
              }
              icon={<JourneyStatIcon type="memories" />}
              bgImage={MEMORIES_BG}
              onPress={handleGoToStories}
            />

            <OverviewJourneyCard
              label="BENEFICIARIES"
              valueElement={
                <>
                  <Text className="text-brand" style={TYPE.uiTitle}>{beneficiariesCount}</Text>
                  <Text className="text-text-strong ml-1" style={TYPE.body}>people</Text>
                </>
              }
              icon={<JourneyStatIcon type="beneficiaries" />}
              bgImage={BENEFI_BG}
              onPress={handleGoToSettings}
            />

            <OverviewJourneyCard
              label="TIME CAPSULES"
              valueElement={
                <Text className="text-text-muted" style={TYPE.body}>Coming soon</Text>
              }
              icon={<JourneyStatIcon type="capsules" />}
              bgImage={CAPSULE_BG}
            />

            <OverviewJourneyCard
              label="STREAK COUNT"
              valueElement={
                <>
                  <Text className="text-text-strong" style={TYPE.body}>You're on a </Text>
                  <Text className="text-brand" style={TYPE.body}>{streakCount}-day</Text>
                  <Text className="text-text-strong" style={TYPE.body}> streak</Text>
                </>
              }
              icon={<JourneyStatIcon type="streak" />}
              bgImage={STREAK_BG}
            />
          </View>

          {/* ── Recent Activities ─────────────────────────────────── */}
          <RecentActivitiesSection />

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
              shadowColor: '#170B00',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Plus size={26} color="white" strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
        </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
