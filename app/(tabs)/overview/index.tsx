import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ImageBackground,
  Image,
  Modal,
} from 'react-native';
import { Pressable, Text } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Zap, MessageCircle, Trophy, ChevronRight, Folder, UserCheck, Hourglass, Activity, HelpCircle, Check, X } from 'lucide-react-native';
import { useUiStore } from '@/store';
import { useUserStats, useMemoriesStats, useCapsuleStats } from '@/hooks/queries/use-overview';
import { useUserStore } from '@/store';
import { StatCard, DashboardHeader, Spinner, OverviewSkeleton, GradientText, GreetingIcon, SplineChart, JourneyStatIcon } from '@/components/ui';
import { useStartConversation } from '@/hooks/mutations/use-memory-mutations';
import { COLORS, FONTS } from '@/constants/tokens';
import { useOverviewPrompts, useDailyPrompts } from '@/hooks/queries/use-prompts';
import { useProfile } from '@/hooks/queries/use-profile';
import { useActivities } from '@/hooks/queries/use-activities';
import { DailyPromptSection } from '@/components/overview/DailyPromptSection';
import { RecentActivitiesSection } from '@/components/overview/RecentActivitiesSection';
import { BrowseTopicsSection } from '@/components/overview/BrowseTopicsSection';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withSpring,
  useAnimatedScrollHandler, interpolate, Extrapolation,
} from 'react-native-reanimated';

const WELCOME_BG = require('../../../assets/images/backgrounds/welcome_bg.png');
const ENRICHMENT_BG = require('../../../assets/images/backgrounds/enrichment_bg.png');
const MEMORIES_BG = require('../../../assets/images/backgrounds/dash_memories_card.png');
const BENEFI_BG = require('../../../assets/images/backgrounds/dash_benefi_card.png');
const CAPSULE_BG = require('../../../assets/images/backgrounds/dash_time_cap_card.png');
const STREAK_BG = require('../../../assets/images/backgrounds/side_cards_for_streak.png');



import type { IMemory } from '@/types';

interface OverviewJourneyCardProps {
  label: string;
  valueElement: React.ReactNode;
  icon: any;
  onPress?: () => void;
  bgColor?: string;
  borderColor?: string;
  bgImage?: any;
}

function OverviewJourneyCard({
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
          className="text-[10px] font-bold uppercase tracking-widest text-text-weak" 
          style={{ fontFamily: FONTS.sansBold }}
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
          <Text className="text-3xl">{icon}</Text>
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
}

// ─── Streak Modal ─────────────────────────────────────────────────────────────

function getStreakMessage(days: number): string {
  if (days >= 21) return `${days} days strong — This is dedication!`;
  if (days >= 8) return "You're on a roll! Your consistency is inspiring.";
  if (days === 7) return "A full week of reflection — your story is taking shape!";
  if (days >= 3) return "Great rhythm! You're showing up and finding your pace.";
  return "Every story starts with the first step. You've got this.";
}

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
  streakCount: number;
  stats: any;
  user: any;
}

function StreakModal({ visible, onClose, streakCount, stats, user }: StreakModalProps) {
  const weekStreak = streakCount > 0 ? Math.floor(streakCount / 7) : 0;
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat

  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />

      {/* Panel */}
      <View style={{
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 32,
        ...Platform.select({
          ios: { shadowColor: '#170B00', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20 },
          android: { elevation: 16 },
        }),
      }}>
        {/* Handle */}
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.strokeStrong, opacity: 0.3, marginBottom: 20 }} />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <Text style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong }}>Your Streak</Text>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); onClose(); }}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color={COLORS.textBase} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Week streak circle */}
        <View style={{ alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <View style={{
            width: 110, height: 110, borderRadius: 55,
            backgroundColor: `${COLORS.brand}12`,
            borderWidth: 1, borderColor: `${COLORS.brand}25`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: FONTS.serif, fontSize: 48, fontWeight: '700', color: COLORS.brand, lineHeight: 54 }}>
              {weekStreak}
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ fontFamily: FONTS.serif, fontSize: 18, color: COLORS.textStrong }}>Week streak</Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak, textAlign: 'center', maxWidth: 240 }}>
              {getStreakMessage(streakCount)}
            </Text>
          </View>
        </View>

        {/* Week calendar */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {DAY_LABELS.map((label, index) => {
            const isToday = index === dayOfWeek;
            const isInStreak = streakCount > 0 && index <= dayOfWeek && index >= Math.max(0, dayOfWeek - (streakCount - 1));
            // Calculate date for this weekday
            const diff = index - dayOfWeek;
            const d = new Date(today);
            d.setDate(today.getDate() + diff);
            const dateNum = d.getDate();

            return (
              <View key={index} style={{ alignItems: 'center', gap: 6, minWidth: 32 }}>
                <Text style={{
                  fontFamily: FONTS.sansBold, fontSize: 10, textTransform: 'uppercase',
                  color: isToday ? COLORS.textStrong : COLORS.textMuted,
                  letterSpacing: 0.5,
                }}>
                  {isToday ? 'Now' : label}
                </Text>
                {isInStreak ? (
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={13} color="white" strokeWidth={3} />
                  </View>
                ) : (
                  <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: COLORS.strokeWeaker, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: COLORS.textMuted }}>{dateNum}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Stats row */}
        <View style={{
          backgroundColor: COLORS.fillWeak, borderRadius: 16,
          padding: 4, paddingTop: 8,
        }}>
          <Text style={{ fontFamily: FONTS.geist, fontSize: 10, color: COLORS.textMuted, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Streak restore coming soon
          </Text>
          <View style={{ flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden' }}>
            {[
              { label: 'Days', value: stats.streak_count || user?.streak || 0 },
              { label: 'Reflections', value: stats.reflections_count || 0 },
              { label: 'Stories', value: stats.stories_count || 0 },
            ].map((item, i) => (
              <View key={item.label} style={{
                flex: 1, paddingVertical: 16, alignItems: 'center', gap: 6,
                borderRightWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
                borderRightColor: COLORS.strokeWeaker,
              }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: COLORS.textWeak }}>{item.label}</Text>
                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 20, color: COLORS.textStrong }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
  const router = useRouter();
  const openSheet = useUiStore((s) => s.openSheet);
  const user = useUserStore((s) => s.user);
  const greeting = useMemo(() => getGreeting(), []);
  // useBright computed once at mount — hour doesn't change meaningfully during a session
  const useBright = useMemo(() => {
    const h = new Date().getHours();
    return h >= 6 && h < 17;
  }, []);

  const [showStreakModal, setShowStreakModal] = useState(false);

  // Scroll-driven FAB: track scroll position to show/hide the floating + button
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });

  // "Add story" pill fades out as the hero scrolls off screen
  const addStoryPillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [80, 180], [1, 0], Extrapolation.CLAMP),
  }));

  // Floating + FAB fades in once the hero has scrolled off
  const fabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [120, 220], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.value, [120, 220], [0.7, 1], Extrapolation.CLAMP) }],
  }));

  // Track manual pull-to-refresh separately from background refetches.
  // isRefetching from TanStack Query is true for ALL background refetches
  // (focus refetch, interval, stale, etc.) — using it directly for RefreshControl
  // causes the spinner to appear and layout to shift every 30s or on tab focus.
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Data fetching
  const { data: profile } = useProfile();
  const { data: statsData, refetch: refetchStats, isLoading: statsLoading } = useUserStats();
  const { data: memoriesStats, refetch: refetchMemories, isLoading: memoriesLoading } = useMemoriesStats();
  const { data: capsuleStats, refetch: refetchCapsule, isLoading: capsuleLoading } = useCapsuleStats();
  const { data: dailyPrompts, refetch: refetchPrompts, isLoading: promptsLoading } = useDailyPrompts();
  const { data: overviewTopics, refetch: refetchTopics, isLoading: topicsLoading } = useOverviewPrompts();
  const { data: activitiesData, refetch: refetchActivities, isLoading: activitiesLoading } = useActivities({ page: 1, limit: 4 });
  const { mutate: startConversation, isPending: startingConversation } = useStartConversation();

  // Manual pull-to-refresh: refetch everything and clear the spinner when done
  const handleManualRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchMemories(),
        refetchCapsule(),
        refetchPrompts(),
        refetchTopics(),
        refetchActivities(),
      ]);
    } finally {
      setManualRefreshing(false);
    }
  }, [refetchStats, refetchMemories, refetchCapsule, refetchPrompts, refetchTopics, refetchActivities]);

  const handleStartConversation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startConversation(undefined, {
      onSuccess: (res) => {
        const memory = res.data as IMemory;
        router.push({ pathname: '/chat/[id]', params: { id: memory._id } });
      },
    });
  }, [router, startConversation]);

  const stats = statsData ?? {};
  const streakCount = Number(user?.streak) || Number(stats.streak_count) || 0;
  const enrichmentScore = Number(stats.enrichment_score) || 0;
  const memoriesCount = memoriesStats?.stories_count ?? 0;
  const weeklyMemories = memoriesStats?.week_count ?? 0;
  const beneficiariesCount = Number(stats.beneficiaries_count) || 0;
  const capsuleCount = capsuleStats?.scheduled_count || 0;
  const quickPending = Number(stats.quick_capture_pending_count) || 0;

  const prompts = dailyPrompts || [];
  const topics = overviewTopics || [];
  const activities = activitiesData?.docs || [];

  const displayName = user?.nickname || user?.first_name || user?.last_name || '';
  const isLoading = statsLoading || memoriesLoading || capsuleLoading || promptsLoading || topicsLoading || activitiesLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <DashboardHeader title="Overview" />

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
          <Animated.View entering={FadeInDown.duration(600)} className="flex-row items-center gap-4">
            <GreetingIcon type={useBright ? 'sun' : 'moon'} size={40} />
            <View className="flex-1">
              <Animated.Text className="text-[32px] text-text-strong leading-[1.2]" style={{ fontFamily: FONTS.serif }}>
                {greeting}
                {displayName && (
                  <Animated.Text style={{ color: COLORS.success, fontStyle: 'italic' }}> {displayName}.</Animated.Text>
                )}
              </Animated.Text>
            </View>
          </Animated.View>

          {/* ── Quick-Capture Status ─────────────────────────────── */}
          {quickPending > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/stories')}
              activeOpacity={0.7}
              className="flex-row items-center gap-3 bg-brand/5 border border-brand/20 rounded-2xl p-4 shadow-sm"
            >
              <View className="size-8 bg-brand rounded-full items-center justify-center">
                <Zap size={14} color="white" fill="white" />
              </View>
              <Animated.Text className="text-sm text-text-strong flex-1" style={{ fontFamily: FONTS.sansMedium }}>
                <Animated.Text className="text-brand font-bold">{quickPending}</Animated.Text> quick capture{quickPending > 1 ? 's' : ''} finishing up...
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
                className="rounded-2xl overflow-hidden border border-stroke-weaker bg-white"
                imageStyle={{ borderRadius: 16 }}
              >
                <View className="p-7 gap-8">
                  <View className="flex-row items-start justify-between">
                    <Text className="text-[24px] text-text-strong flex-1 leading-snug" style={{ fontFamily: FONTS.serif }}>
                      What's on your{"\n"}mind today?
                    </Text>
                    <TouchableOpacity
                      onPress={() => { Haptics.selectionAsync(); setShowStreakModal(true); }}
                      activeOpacity={0.8}
                      className="flex-row items-center gap-3 bg-white/90 px-3.5 py-2 rounded-full border border-white/30"
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Zap size={14} color={COLORS.brand} fill={COLORS.brand} />
                        <Text className="text-sm font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>{streakCount}</Text>
                      </View>
                      <View className="w-px h-3 bg-stroke-weaker" />
                      <View className="flex-row items-center gap-1.5">
                        <Trophy size={14} color={COLORS.warning} />
                        <Text className="text-sm font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>{enrichmentScore}%</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center gap-3">
                    {/* Add story — primary CTA, wider (flex-[1.5]), fades out on scroll */}
                    <Animated.View style={[{ flex: 1.5 }, addStoryPillStyle]}>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          router.push({ pathname: '/editor', params: { mode: 'story' } });
                        }}
                        activeOpacity={0.8}
                        className="flex-row items-center justify-center gap-2.5 h-14 bg-brand rounded-full w-full"
                      >
                        <Plus size={20} color="white" strokeWidth={3} />
                        <Animated.Text className="text-sm font-bold text-white" style={{ fontFamily: FONTS.sansBold }}>Add story</Animated.Text>
                      </TouchableOpacity>
                    </Animated.View>

                    {/* Quick capture — secondary CTA, narrower (flex-1) */}
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({ pathname: '/editor', params: { mode: 'quick-capture' } });
                      }}
                      activeOpacity={0.7}
                      className="flex-1 flex-row items-center justify-center gap-2 h-14 bg-white border border-stroke-weaker rounded-full shadow-sm"
                    >
                      <Zap size={16} color={COLORS.textBase} strokeWidth={2} />
                      <Animated.Text className="text-sm font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>Quick capture</Animated.Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ImageBackground>
            </Animated.View>

            {/* Card 2: Enrichment Hero */}
            <Animated.View entering={FadeInDown.delay(200)}>
              <ImageBackground
                source={ENRICHMENT_BG}
                className="rounded-2xl overflow-hidden border border-stroke-weaker bg-white"
                imageStyle={{ borderRadius: 16 }}
              >
                <View className="p-7 gap-5">
                  <View className="flex-row items-center gap-4">
                    <GradientText
                      colors={['#5B9BD5', '#A8D4F5']}
                      style={{ fontSize: 48, fontFamily: FONTS.serif, lineHeight: 54 }}
                    >
                      {enrichmentScore}%
                    </GradientText>
                    <View className="bg-white/80 px-3 py-1.5 rounded-full border border-white/30">
                      <Text className="text-[10px] font-bold text-text-strong uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>
                        Enrichment score
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[15px] text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                    Share stories & files to build context. Link apps to enrich your Memento.
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      openSheet('memory-insights');
                    }}
                    className="h-11 border border-stroke-weaker rounded-full items-center justify-center px-6 self-start bg-white/50 shadow-sm"
                    android_ripple={{ color: COLORS.brandSubtle }}
                  >
                    <Text className="text-sm font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>View insights</Text>
                  </Pressable>
                </View>
              </ImageBackground>
            </Animated.View>
          </View>

          {/* ── Interactive Spline Chart ────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(250)}>
            <SplineChart />
          </Animated.View>

          {/* ── Stat Column (Web Parity Stack) ────────────────────────── */}
          <View className="gap-4">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>Your Journey</Text>
            </View>

            <OverviewJourneyCard
              label="ALL MEMORIES"
              valueElement={
                <View className="gap-0.5">
                  <View className="flex-row items-baseline">
                    <Text className="text-xl font-bold text-[#0C71FF]" style={{ fontFamily: FONTS.sansBold }}>{memoriesCount}</Text>
                    <Text className="text-base font-bold text-text-strong ml-1" style={{ fontFamily: FONTS.sansBold }}>items</Text>
                  </View>
                  {weeklyMemories > 0 && (
                    <Text className="text-[11px] text-text-weak" style={{ fontFamily: FONTS.sans }}>
                      +{weeklyMemories} this week
                    </Text>
                  )}
                </View>
              }
              icon={<JourneyStatIcon type="memories" />}
              bgImage={MEMORIES_BG}
              onPress={() => router.push('/(tabs)/stories')}
            />

            <OverviewJourneyCard
              label="BENEFICIARIES"
              valueElement={
                <>
                  <Text className="text-xl font-bold text-[#FF7D0C]" style={{ fontFamily: FONTS.sansBold }}>{beneficiariesCount}</Text>
                  <Text className="text-base font-bold text-text-strong ml-1" style={{ fontFamily: FONTS.sansBold }}>people</Text>
                </>
              }
              icon={<JourneyStatIcon type="beneficiaries" />}
              bgImage={BENEFI_BG}
              onPress={() => router.push('/settings')}
            />

            <OverviewJourneyCard
              label="TIME CAPSULES"
              valueElement={
                <>
                  <Text className="text-xl font-bold text-[#FF7D0C]" style={{ fontFamily: FONTS.sansBold }}>{capsuleCount}</Text>
                  <Text className="text-base font-bold text-text-strong ml-1" style={{ fontFamily: FONTS.sansBold }}>posts scheduled</Text>
                </>
              }
              icon={<JourneyStatIcon type="capsules" />}
              bgImage={CAPSULE_BG}
              onPress={() => router.push('/(tabs)/capsule')}
            />

            <OverviewJourneyCard
              label="STREAK COUNT"
              valueElement={
                <>
                  <Text className="text-base font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>You're on a </Text>
                  <Text className="text-base font-bold text-[#FF7D0C]" style={{ fontFamily: FONTS.sansBold }}>{streakCount}-day</Text>
                  <Text className="text-base font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}> streak</Text>
                </>
              }
              icon={<JourneyStatIcon type="streak" />}
              bgImage={STREAK_BG}
            />
          </View>

          {/* ── Daily Prompts ─────────────────────────────────────── */}
          <DailyPromptSection prompts={prompts} isLoading={promptsLoading} />

          {/* ── Recent Activities ─────────────────────────────────── */}
          <RecentActivitiesSection activities={activities} isLoading={activitiesLoading} />

          {/* ── Browse Topics (Horizontal Scroll) ─────────────────── */}
          <BrowseTopicsSection prompts={topics} isLoading={topicsLoading} />

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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: '/editor', params: { mode: 'story' } });
            }}
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

      {/* Streak tracker modal */}
      <StreakModal
        visible={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        streakCount={streakCount}
        stats={stats}
        user={user}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
