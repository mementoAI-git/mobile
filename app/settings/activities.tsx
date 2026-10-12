import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, ImageBackground, Text, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { useInfiniteActivities, type Activity } from '@/hooks/queries/use-activities';
import { ActivityListItem } from '@/components/overview/ActivityListItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ResponsiveScreen } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const EMPTY_MEMORIES_IMG = require('../../assets/images/illustrations/empty_memories.webp');
const PAGE_SIZE = 20;

// ─── Editorial hero card ───────────────────────────────────────────────────

const WELCOME_BG = require('../../assets/images/backgrounds/welcome_bg.png');

function EditorialHeroCard({ totalDocs }: { totalDocs: number }) {
  if (totalDocs === 0) return null;

  const bodyText = totalDocs >= 100
    ? `You've captured ${totalDocs} moments so far. Every memory you save, every story you write is part of what you'll leave behind. Keep going.`
    : `You've made a start. ${totalDocs} memories saved and growing. The more you capture, the richer the picture becomes.`;

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={{ marginBottom: 20, borderRadius: 32, overflow: 'hidden', backgroundColor: COLORS.card }}
    >
      <ImageBackground source={WELCOME_BG} style={{ padding: 24, gap: 12 }} imageStyle={{ opacity: 0.04 }} resizeMode="repeat">
        <Text style={{ ...TYPE.sectionTitle, color: COLORS.textStrong, lineHeight: 28 }}>
          Your legacy{'\n'}is growing.
        </Text>
        <Text style={{ ...TYPE.label, color: COLORS.textWeak, lineHeight: 21 }}>
          {bodyText}
        </Text>
      </ImageBackground>
    </Animated.View>
  );
}

// ─── Stats banner (4 stats, all brand orange) ─────────────────────────────

function StatsBanner({ totalDocs, docs }: { totalDocs: number; docs: Activity[] }) {
  const thisWeek = useMemo(() => {
    const cutoff = dayjs().subtract(7, 'day');
    return docs.filter((d) => dayjs(d.created_at).isAfter(cutoff)).length;
  }, [docs]);

  const created = useMemo(() => docs.filter((d) => d.action === 'created').length, [docs]);
  const updated = useMemo(() => docs.filter((d) => d.action === 'updated').length, [docs]);

  const stats = [
    { label: 'Total', value: totalDocs > 0 ? String(totalDocs) : '—' },
    { label: 'This week', value: String(thisWeek) },
    { label: 'Created', value: String(created) },
    { label: 'Updated', value: String(updated) },
  ];

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={{
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: COLORS.card,
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <View style={{ width: 1, backgroundColor: COLORS.strokeWeaker, marginVertical: 14 }} />}
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16, gap: 3 }}>
            <Text style={{ ...TYPE.uiTitle, color: COLORS.brand, lineHeight: 24 }}>
              {s.value}
            </Text>
            <Text style={{ ...TYPE.eyebrow, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {s.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function ActivitiesScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteActivities({ limit: PAGE_SIZE });

  const [showCount, setShowCount] = useState(false);

  const displayDocs = useMemo(
    () => data?.pages.flatMap((activityPage) => activityPage.docs) ?? [],
    [data?.pages],
  );
  const totalDocs = data?.pages[0]?.totalDocs ?? 0;

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const y = contentOffset.y;
    setShowCount(y > 230);

    const isCloseToBottom = layoutMeasurement.height + y >= contentSize.height - 150;
    if (isCloseToBottom && hasNextPage && !isFetchingNextPage) {
      Haptics.selectionAsync();
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <ResponsiveScreen maxWidth={720}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 }}>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) { router.back(); } else { router.replace('/settings'); } }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.fillWeak, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={22} color={COLORS.textBase} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={TYPE.screenTitle}>
              Activity
            </Text>
            <Text style={[TYPE.bodySmall, { marginTop: 1 }]}>
              {showCount && totalDocs > 0
                ? `${totalDocs} actions across your account`
                : ''}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <ImageBackground source={PATTERN} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} imageStyle={{ opacity: 0.03 }} resizeMode="repeat" />

          {isLoading && displayDocs.length === 0 ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 48, paddingTop: 4 }}
            >
              {/* Editorial hero card skeleton */}
              <View style={{ marginBottom: 20 }}>
                <Skeleton className="h-[140px] w-full rounded-[32px]" />
              </View>

              {/* Stats banner skeleton */}
              <View style={{ marginBottom: 20, flexDirection: 'row', gap: 8 }}>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 flex-1 rounded-2xl" />
                ))}
              </View>

              {/* Activity items card skeleton */}
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 24,
                  padding: 16,
                  gap: 16,
                  borderWidth: 1,
                  borderColor: COLORS.strokeWeaker,
                }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} className="flex-row items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <View className="flex-1 gap-2">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-1/3 rounded-md" />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : displayDocs.length === 0 ? (
            <EmptyState
              image={EMPTY_MEMORIES_IMG}
              title="No activity yet"
              description="Creating memories, editing stories, and sending capsules will all show up here."
              actionLabel="Create a story"
              onAction={() => router.push('/editor?mode=quick-capture')}
            />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 48, paddingTop: 4 }}
              scrollEventThrottle={16}
              onScroll={handleScroll}
            >

              {/* Editorial hero card */}
              <EditorialHeroCard totalDocs={totalDocs} />

              {/* Stats banner */}
              <StatsBanner totalDocs={totalDocs} docs={displayDocs} />

              {/* Activity items — unified card list */}
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 24,
                  overflow: 'hidden',
                }}
              >
              {displayDocs.map((item, index) => (
                <ActivityListItem
                  key={item._id}
                  activity={item}
                  showDivider={index > 0}
                />
              ))}
            </View>

            {/* Loading Indicator */}
            {isFetchingNextPage && (
              <ActivityIndicator
                size="small"
                color={COLORS.brand}
                style={{ marginVertical: 24 }}
              />
            )}

            {/* End of list metadata */}
            {!hasNextPage && totalDocs > 0 && (
              <Text
                style={{
                  ...TYPE.metadata,
                  color: COLORS.textMuted,
                  textAlign: 'center',
                  marginTop: 24,
                }}
              >
                Showing all {totalDocs} activities
              </Text>
            )}
          </ScrollView>
        )}
      </View>
      </ResponsiveScreen>
    </SafeAreaView>
  );
}
