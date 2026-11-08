import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Settings from 'lucide-react-native/icons/settings';
import Archive from 'lucide-react-native/icons/archive';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { EnrichmentFieldsList } from '@/components/insights/EnrichmentFieldsList';
import {
  EnrichmentFieldDetail,
  InsightDetail,
  ObservationDetail,
} from '@/components/insights/InsightDetailViews';
import { InsightsMessage } from '@/components/insights/InsightsPrimitives';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { MemoryStatistics } from '@/components/insights/MemoryStatistics';
import { MilestonesPanel } from '@/components/insights/MilestonesPanel';
import { ObservationList } from '@/components/insights/ObservationList';
import type { EnrichmentCategory } from '@/constants/enrichment';
import { queryKeys } from '@/constants/query-keys';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  INSIGHTS_SECTIONS,
  getEnrichmentField,
  isPreference,
  toObservationItem,
  type Insight,
  type InsightSource,
  type InsightsSection,
  type ObservationItem,
} from '@/features/insights/insights-model';
import { mementoRoute } from '@/features/chat/memento-links';
import { useObservations } from '@/hooks/queries/use-insights';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';

type DetailView =
  | { kind: 'insight'; insight: Insight }
  | { kind: 'observation'; item: ObservationItem }
  | { kind: 'field'; field: EnrichmentCategory };

function toSection(value: unknown): InsightsSection | undefined {
  return INSIGHTS_SECTIONS.find((entry) => entry.key === value)?.key;
}

export default function InsightsScreen() {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ observation?: string; section?: string }>();
  // ?section= opens a tab directly, as the Account enrichment card does.
  const [section, setSection] = useState<InsightsSection>(() => toSection(params.section) ?? 'observations');
  const [history, setHistory] = useState<DetailView[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const view = history.at(-1);

  const { data, error, isLoading, refetch } = useObservations();
  const loaded = data != null;
  const generating = Boolean(data?.generating);
  const all = useMemo(() => data?.observations ?? [], [data?.observations]);
  const observations = useMemo(() => all.filter((item) => !isPreference(item)).map(toObservationItem), [all]);
  const preferences = useMemo(() => all.filter(isPreference).map(toObservationItem), [all]);

  // Memento can forget a note while it is open, so its page closes with it.
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(all.map((item) => item.id));
    setHistory((current) => {
      const kept = current.filter((entry) => entry.kind !== 'observation' || ids.has(entry.item.id));
      return kept.length === current.length ? current : kept;
    });
  }, [all, loaded]);

  // ?observation=<id> opens that note, as chat links and voice do.
  const requested = typeof params.observation === 'string' ? params.observation : undefined;
  useEffect(() => {
    if (!loaded || !requested) return;
    const found = all.find((entry) => entry.id === requested);
    if (!found) return;
    const item = toObservationItem(found);
    setSection(isPreference(found) ? 'preferences' : 'observations');
    setHistory((current) => {
      const top = current.at(-1);
      return top?.kind === 'observation' && top.item.id === item.id ? current : [...current, { kind: 'observation', item }];
    });
    router.setParams({ observation: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, requested]);

  useEffect(() => {
    const requestedSection = toSection(params.section);
    if (!requestedSection) return;
    setSection(requestedSection);
    setHistory([]);
    router.setParams({ section: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.section]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [history.length]);

  const openView = useCallback((next: DetailView) => setHistory((current) => [...current, next]), []);
  const goBack = useCallback(() => {
    Haptics.selectionAsync();
    setHistory((current) => current.slice(0, -1));
  }, []);

  // Android back steps out of a details page before leaving Insights.
  useFocusEffect(
    useCallback(() => {
      if (!history.length) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        setHistory((current) => current.slice(0, -1));
        return true;
      });
      return () => subscription.remove();
    }, [history.length]),
  );

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  }, [router]);

  const handleSettings = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/settings');
  }, [router]);

  const selectSection = useCallback((next: InsightsSection) => {
    Haptics.selectionAsync();
    setSection(next);
  }, []);

  const openObservation = useCallback((item: ObservationItem) => openView({ kind: 'observation', item }), [openView]);
  const openInsight = useCallback((insight: Insight) => openView({ kind: 'insight', insight }), [openView]);
  const openField = useCallback((field: EnrichmentCategory) => openView({ kind: 'field', field }), [openView]);

  const viewSource = useCallback(
    (source: InsightSource) => {
      router.push(mementoRoute({ kind: source.type === 'conversation' ? 'conversation' : 'story', id: source.id }));
    },
    [router],
  );

  const reflectOn = useCallback(
    (field: EnrichmentCategory) => {
      router.push({
        pathname: '/(tabs)/chat',
        params: {
          discussText: `I’d like to reflect on ${getEnrichmentField(field).label.toLowerCase()}.`,
          discussId: `${Date.now()}`,
        },
      });
    },
    [router],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: queryKeys.observations }),
      queryClient.invalidateQueries({ queryKey: queryKeys.insights }),
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats }),
      queryClient.invalidateQueries({ queryKey: queryKeys.memoriesStats }),
      queryClient.invalidateQueries({ queryKey: ['insight-sources'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const renderNotes = (items: ObservationItem[], emptyTitle: string, emptyBody: string) => {
    if (error && !loaded) {
      return <InsightsMessage body="Couldn’t load your insights." actionLabel="Retry insights" onAction={() => void refetch()} />;
    }
    if ((isLoading || generating) && !items.length) {
      return <InsightsMessage loading body={generating ? 'Going through what you’ve shared…' : 'Loading your insights…'} />;
    }
    if (!items.length) {
      return <InsightsMessage icon={<Archive size={32} color={colors.textWeak} />} title={emptyTitle} body={emptyBody} />;
    }
    return <ObservationList items={items} onOpen={openObservation} />;
  };

  const renderSection = () => {
    switch (section) {
      case 'observations':
        return renderNotes(
          observations,
          'Your observations are taking shape',
          'Keep saving memories and reflecting. What Memento notices about you will appear here.',
        );
      case 'insights':
        return <InsightsPanel onOpen={openInsight} />;
      case 'preferences':
        return renderNotes(
          preferences,
          'No preferences yet',
          'As you share what you like and dislike, your preferences will appear here.',
        );
      case 'enrichment':
        return <EnrichmentFieldsList onExplore={openField} />;
      case 'milestones':
        return <MilestonesPanel />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.78}
          style={styles.headerButton}
        >
          <ArrowLeft size={22} color={colors.textBase} strokeWidth={2.2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSettings}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          activeOpacity={0.78}
          style={styles.headerButton}
        >
          <Settings size={22} color={colors.textBase} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />}
      >
        {view ? (
          <View key={history.length}>
            {view.kind === 'insight' ? (
              <InsightDetail insight={view.insight} onBack={goBack} onView={viewSource} />
            ) : view.kind === 'observation' ? (
              <ObservationDetail item={view.item} onBack={goBack} onView={viewSource} />
            ) : (
              <EnrichmentFieldDetail field={view.field} onBack={goBack} onView={viewSource} onReflect={reflectOn} />
            )}
          </View>
        ) : (
          <>
            <Animated.Text
              entering={FadeInDown.duration(600)}
              accessibilityRole="header"
              style={[TYPE.screenTitle, { color: colors.textStrong }]}
            >
              My <Text style={TYPE.screenTitleAccent}>insights</Text>
            </Animated.Text>

            <Animated.View entering={FadeInDown.duration(600).delay(100)}>
              <MemoryStatistics />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(200)} style={{ gap: 24 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsScroller}
                contentContainerStyle={styles.tabs}
                accessibilityRole="tablist"
              >
                {INSIGHTS_SECTIONS.map((tab) => {
                  const selected = section === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => selectSection(tab.key)}
                      activeOpacity={0.8}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      style={[styles.tab, selected && styles.activeTab]}
                    >
                      <Text style={[styles.tabText, selected && styles.activeTabText]}>{tab.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Animated.View key={section} entering={FadeIn.duration(300)}>
                {renderSection()}
              </Animated.View>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => ({
  header: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.strokeWeaker,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 64,
    // Title, statistics and the sections tabs sit 40px apart (main-screen sections).
    gap: 40,
  },
  // The tabs scroll edge to edge while lining up with the 16px gutter.
  tabsScroller: {
    marginHorizontal: -16,
  },
  tabs: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: colors.strokeWeak,
  },
  activeTab: {
    backgroundColor: colors.activeFill,
    borderColor: 'transparent',
  },
  tabText: {
    color: colors.textBase,
    ...TYPE.label,
  },
  activeTabText: {
    color: colors.activeText,
  },
});
