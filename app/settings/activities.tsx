import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { useActivities, type Activity } from '@/hooks/queries/use-activities';
import { ActivityListItem } from '@/components/overview/ActivityListItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { COLORS, FONTS } from '@/constants/tokens';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
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
      style={{ marginHorizontal: 20, marginBottom: 20, borderRadius: 32, overflow: 'hidden', backgroundColor: COLORS.card }}
    >
      <ImageBackground source={WELCOME_BG} style={{ padding: 24, gap: 12 }} imageStyle={{ opacity: 0.04 }} resizeMode="repeat">
        <Text style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong, lineHeight: 28 }}>
          Your legacy{'\n'}is growing.
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, lineHeight: 21 }}>
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
        marginHorizontal: 20,
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
            <Text style={{ fontFamily: FONTS.sansBold, fontSize: 20, color: COLORS.brand, lineHeight: 24 }}>
              {s.value}
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
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
  const [page, setPage] = useState(1);
  const [allDocs, setAllDocs] = useState<Activity[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: page1, isLoading } = useActivities({ page: 1, limit: PAGE_SIZE });

  React.useEffect(() => {
    if (page1?.docs && allDocs.length === 0) {
      setAllDocs(page1.docs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page1?.docs]);

  const handleLoadMore = useCallback(async () => {
    Haptics.selectionAsync();
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const { get } = await import('@/api/mutations');
      const endpoint = (await import('@/api/endpoint')).default;
      const qs = new URLSearchParams({ page: String(nextPage), limit: String(PAGE_SIZE) });
      const res = await get<any>(`${endpoint.activities}?${qs.toString()}`);
      if (res?.data?.docs) {
        setAllDocs((prev) => [...prev, ...res.data.docs]);
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [page]);

  const hasMore = page1 ? (page < page1.totalPages) : false;
  const totalDocs = page1?.totalDocs ?? 0;
  const displayDocs = allDocs.length > 0 ? allDocs : (page1?.docs ?? []);

  const renderItems = useMemo(() => displayDocs, [displayDocs]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 16 }}>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) { router.back(); } else { router.replace('/settings'); } }}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.fillWeaker, borderWidth: 1, borderColor: COLORS.strokeWeaker, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.serif, fontSize: 28, color: COLORS.textStrong, lineHeight: 34 }}>
            Activity
          </Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textWeak, marginTop: 1 }}>
            {totalDocs > 0 ? `${totalDocs} actions across your account` : 'Your recent actions'}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <ImageBackground source={PATTERN} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} imageStyle={{ opacity: 0.03 }} resizeMode="repeat" />

        {isLoading && displayDocs.length === 0 ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
            <Skeleton className="h-20 rounded-[24px] mb-2" />
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </View>
        ) : displayDocs.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
            <Text style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong, textAlign: 'center' }}>
              No activity yet
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, textAlign: 'center', lineHeight: 20 }}>
              Creating memories, editing stories, sending capsules. It all shows up here.
            </Text>
          </Animated.View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48, paddingTop: 4 }}>

            {/* Editorial hero card */}
            <EditorialHeroCard totalDocs={totalDocs} />

            {/* Stats banner */}
            <StatsBanner totalDocs={totalDocs} docs={displayDocs} />

            {/* Activity items — standalone cards */}
            {renderItems.map((item) => (
              <View
                key={item._id}
                style={{
                  marginHorizontal: 20,
                  marginBottom: 2,
                  backgroundColor: COLORS.card,
                  borderRadius: 20,
                }}
              >
                <ActivityListItem activity={item} showDivider={false} />
              </View>
            ))}

            {/* Load more */}
            {hasMore && (
              <View style={{ marginHorizontal: 20, marginTop: 16, gap: 8 }}>
                <TouchableOpacity
                  onPress={handleLoadMore}
                  disabled={loadingMore}
                  activeOpacity={0.8}
                  style={{
                    height: 48,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: COLORS.strokeWeak,
                    backgroundColor: COLORS.fillWeaker,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {loadingMore
                    ? <ActivityIndicator size="small" color={COLORS.brand} />
                    : <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 14, color: COLORS.textStrong }}>Load more</Text>
                  }
                </TouchableOpacity>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 11, color: COLORS.textMuted, textAlign: 'center' }}>
                  Showing {displayDocs.length} of {totalDocs}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
