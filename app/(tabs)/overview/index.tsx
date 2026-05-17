import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ImageBackground,
  Image,
} from 'react-native';
import { Pressable, Text } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Zap, MessageCircle, Trophy, ChevronRight, Folder, UserCheck, Hourglass, Activity, HelpCircle } from 'lucide-react-native';
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
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

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

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    if (onPress) scale.value = withSpring(1);
  };

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
        className={`w-full rounded-[24px] border ${borderColor} ${bgColor} flex-row items-center justify-between shadow-sm overflow-hidden`}
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
  const useBright = new Date().getHours() >= 6 && new Date().getHours() < 17;

  // Data fetching
  const { data: profile } = useProfile();
  const { data: statsData, refetch: refetchStats, isRefetching, isLoading: statsLoading } = useUserStats();
  const { data: memoriesStats, isLoading: memoriesLoading } = useMemoriesStats();
  const { data: capsuleStats, isLoading: capsuleLoading } = useCapsuleStats();
  const { data: dailyPrompts, isLoading: promptsLoading } = useDailyPrompts();
  const { data: overviewTopics, isLoading: topicsLoading } = useOverviewPrompts();
  const { data: activitiesData, isLoading: activitiesLoading } = useActivities({ page: 1, limit: 4 });
  const { mutate: startConversation, isPending: startingConversation } = useStartConversation();

  const handleStartConversation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startConversation(undefined, {
      onSuccess: (res) => {
        const memory = res.data as IMemory;
        router.push({ pathname: '/chat/[id]', params: { id: memory._id } });
      },
    });
  };

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

      {isLoading && !isRefetching ? (
        <OverviewSkeleton />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pt-6 pb-32 gap-8"
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetchStats} tintColor={COLORS.brand} />
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
            <Animated.View entering={FadeInDown.delay(100)} style={styles.cardShadow}>
              <ImageBackground
                source={WELCOME_BG}
                className="rounded-[32px] overflow-hidden border border-stroke-weaker bg-white"
                imageStyle={{ borderRadius: 32 }}
              >
                <View className="p-7 gap-8">
                  <View className="flex-row items-start justify-between">
                    <Text className="text-[24px] text-text-strong flex-1 leading-snug" style={{ fontFamily: FONTS.serif }}>
                      What's on your{"\n"}mind today?
                    </Text>
                    <View className="flex-row items-center gap-3 bg-white/90 px-3.5 py-2 rounded-full border border-white shadow-sm">
                      <View className="flex-row items-center gap-1.5">
                        <Zap size={14} color={COLORS.brand} fill={COLORS.brand} />
                        <Text className="text-sm font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>{streakCount}</Text>
                      </View>
                      <View className="w-px h-3 bg-stroke-weaker" />
                      <View className="flex-row items-center gap-1.5">
                        <Trophy size={14} color={COLORS.warning} />
                        <Text className="text-sm font-bold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>{enrichmentScore}%</Text>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between gap-3">
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        openSheet('create-memory');
                      }}
                      activeOpacity={0.8}
                      className="flex-1 flex-row items-center justify-center gap-2.5 h-14 bg-brand rounded-full shadow-lg shadow-brand/20"
                    >
                      <Plus size={20} color="white" strokeWidth={3} />
                      <Animated.Text className="text-sm font-bold text-white" style={{ fontFamily: FONTS.sansBold }}>Add story</Animated.Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        openSheet('quick-capture');
                      }}
                      activeOpacity={0.7}
                      className="size-14 bg-white border border-stroke-weaker rounded-full items-center justify-center shadow-sm"
                    >
                      <Zap size={22} color={COLORS.textBase} strokeWidth={2} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handleStartConversation();
                      }}
                      disabled={startingConversation}
                      activeOpacity={0.7}
                      className="size-14 bg-white border border-stroke-weaker rounded-full items-center justify-center shadow-sm"
                    >
                      {startingConversation ? (
                        <Spinner size="small" />
                      ) : (
                        <MessageCircle size={22} color={COLORS.textBase} strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ImageBackground>
            </Animated.View>

            {/* Card 2: Enrichment Hero */}
            <Animated.View entering={FadeInDown.delay(200)} style={styles.cardShadow}>
              <ImageBackground
                source={ENRICHMENT_BG}
                className="rounded-[32px] overflow-hidden border border-stroke-weaker bg-white"
                imageStyle={{ borderRadius: 32 }}
              >
                <View className="p-7 gap-5">
                  <View className="flex-row items-center gap-4">
                    <GradientText
                      colors={['#5B9BD5', '#A8D4F5']}
                      style={{ fontSize: 48, fontFamily: FONTS.serif, lineHeight: 54 }}
                    >
                      {enrichmentScore}%
                    </GradientText>
                    <View className="bg-white/80 px-3 py-1.5 rounded-full border border-white shadow-sm">
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

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
