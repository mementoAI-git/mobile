import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useActivities, type Activity } from '@/hooks/queries/use-activities';
import { ActivityListItem } from '@/components/overview/ActivityListItem';
import { Skeleton } from '@/components/ui/Skeleton';
import { COLORS, FONTS } from '@/constants/tokens';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const PAGE_SIZE = 20;

export default function ActivitiesScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [allDocs, setAllDocs] = useState<Activity[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial fetch — page 1
  const { data: page1, isLoading } = useActivities({ page: 1, limit: PAGE_SIZE });

  // Seed allDocs from page 1 on first load
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
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </View>
        ) : displayDocs.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 }}>
            <Text style={{ fontFamily: FONTS.serif, fontSize: 22, color: COLORS.textStrong, textAlign: 'center' }}>
              No activity yet
            </Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, textAlign: 'center', lineHeight: 20 }}>
              Your actions — creating memories, editing stories, sending capsules — will appear here.
            </Text>
          </Animated.View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
            {/* Activity card — exact same layout as overview's RecentActivitiesSection */}
            <Animated.View
              entering={FadeInDown.duration(500)}
              style={{ marginHorizontal: 20, marginTop: 4, backgroundColor: COLORS.card, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.strokeWeaker }}
            >
              {displayDocs.map((item, idx) => (
                <ActivityListItem
                  key={item._id}
                  activity={item}
                  showDivider={idx > 0}
                />
              ))}
            </Animated.View>

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
                    : <Text style={{ fontFamily: FONTS.sansSemi, fontSize: 14, color: COLORS.textStrong }}>
                        Load more
                      </Text>
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
