import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, RefreshControl, useWindowDimensions } from 'react-native';
import { MasonryMemoryCard } from './MasonryMemoryCard';
import type { IMemory } from '@/types';
import { COLORS } from '@/constants/tokens';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  buildMasonryColumnLayout,
  getVisibleMasonryColumnLayout,
  type MasonryLayoutEntry,
} from '@/features/memories/masonry-layout';
import { handleMasonryScroll } from '@/features/memories/masonry-scroll';

const COLUMN_COUNT = 2;
const COLUMN_GAP = 10; // px between the two columns
const CARD_GAP = 12;   // px between cards in the same column
const GRID_HORIZONTAL_PADDING = 20;
const WINDOW_OVERSCAN = 900;
const SCROLL_UPDATE_THRESHOLD = 96;
const MEDIA_ASPECT_RATIOS = [4 / 5, 5 / 6, 3 / 4, 1] as const;
const TEXT_CARD_MIN_HEIGHTS = [206, 232, 264] as const;
const ESTIMATED_TITLE_HEIGHT = 42;

interface MasonryMemoryGridProps {
  memories: IMemory[];
  onEndReached?: () => void;
  refreshing?: boolean;
  loadingMore?: boolean;
  onRefresh?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  onMemoryPress?: (memory: IMemory) => void;
  scrollY?: SharedValue<number>;
}

/**
 * MasonryMemoryGrid — pure React Native 2-column masonry layout.
 *
 * Algorithm mirrors web/src/pages/dashboard/stories/components/grid.tsx:
 *   1. Start: distribute items round-robin across columns.
 *   2. After each card measures its height via onLayout, re-balance by
 *      inserting each subsequent item into the shortest column.
 *
 * No external library needed — same technique as the web implementation.
 */
export function MasonryMemoryGrid({
  memories,
  onEndReached,
  refreshing = false,
  loadingMore = false,
  onRefresh,
  ListHeaderComponent,
  ListEmptyComponent,
  onMemoryPress,
  scrollY,
}: MasonryMemoryGridProps) {
  const { width, height: windowHeight } = useWindowDimensions();

  // Map from memory._id → measured height in pixels
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const layoutUpdatesRef = useRef<Record<string, number>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [scrollMetrics, setScrollMetrics] = useState({
    offsetY: 0,
    viewportHeight: windowHeight,
  });
  const scrollMetricsRef = useRef(scrollMetrics);
  const endReachedLockedRef = useRef(false);
  const lastReportedOffsetY = useSharedValue(0);
  const lastReportedViewportHeight = useSharedValue(windowHeight);

  useEffect(() => {
    if (!loadingMore) {
      endReachedLockedRef.current = false;
    }
  }, [loadingMore]);

  useEffect(() => {
    scrollMetricsRef.current = scrollMetrics;
  }, [scrollMetrics]);

  useEffect(() => {
    setScrollMetrics((prev) => {
      if (prev.viewportHeight === windowHeight) return prev;
      return { ...prev, viewportHeight: windowHeight };
    });
  }, [windowHeight]);

  useEffect(() => {
    const memoryIds = new Set(memories.map((memory) => memory._id));
    Object.keys(layoutUpdatesRef.current).forEach((id) => {
      if (!memoryIds.has(id)) {
        delete layoutUpdatesRef.current[id];
      }
    });
    setMeasuredHeights((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([id, measuredHeight]) => {
        if (memoryIds.has(id)) {
          next[id] = measuredHeight;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [memories]);

  const handleLayout = useCallback((id: string, height: number) => {
    if (layoutUpdatesRef.current[id] === height) return;
    layoutUpdatesRef.current[id] = height;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setMeasuredHeights((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.entries(layoutUpdatesRef.current).forEach(([k, v]) => {
          if (prev[k] !== v) {
            next[k] = v;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 16);
  }, []);

  const handleHeaderLayout = useCallback((event: any) => {
    const nextHeight = event.nativeEvent.layout.height;
    setHeaderHeight((prev) => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
  }, []);

  const columnWidth = useMemo(
    () => Math.max(1, Math.floor((width - GRID_HORIZONTAL_PADDING * 2 - COLUMN_GAP) / COLUMN_COUNT)),
    [width],
  );

  const estimateHeight = useCallback((memory: IMemory) => (
    estimateMasonryMemoryHeight(memory, columnWidth)
  ), [columnWidth]);

  const masonryLayout = useMemo(() => (
    buildMasonryColumnLayout({
      items: memories,
      measuredHeights,
      estimateHeight,
      columnCount: COLUMN_COUNT,
      gap: CARD_GAP,
    })
  ), [estimateHeight, measuredHeights, memories]);

  const visibleWindowTop = Math.max(0, scrollMetrics.offsetY - headerHeight);
  const visibleWindowBottom = visibleWindowTop + scrollMetrics.viewportHeight;

  const visibleColumns = useMemo(() => (
    getVisibleMasonryColumnLayout({
      columns: masonryLayout.columns,
      windowTop: visibleWindowTop,
      windowBottom: visibleWindowBottom,
      overscan: WINDOW_OVERSCAN,
    })
  ), [masonryLayout.columns, visibleWindowBottom, visibleWindowTop]);

  const handleScrollMetrics = useCallback(
    (offsetY: number, viewportHeight: number, contentHeight: number) => {
      const previous = scrollMetricsRef.current;
      const shouldUpdate =
        Math.abs(offsetY - previous.offsetY) >= SCROLL_UPDATE_THRESHOLD ||
        viewportHeight !== previous.viewportHeight;

      if (shouldUpdate) {
        const nextMetrics = { offsetY, viewportHeight };
        scrollMetricsRef.current = nextMetrics;
        setScrollMetrics(nextMetrics);
      }

      const didTriggerEndReached = handleMasonryScroll({
        nativeEvent: {
          contentOffset: { y: offsetY },
          layoutMeasurement: { height: viewportHeight },
          contentSize: { height: contentHeight },
        },
      }, {
        onEndReached,
        canTriggerEndReached: !loadingMore && !endReachedLockedRef.current,
      });

      if (didTriggerEndReached) {
        endReachedLockedRef.current = true;
      }
    },
    [loadingMore, onEndReached],
  );

  const animatedScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (scrollY) {
        scrollY.value = event.contentOffset.y;
      }

      const offsetY = event.contentOffset.y;
      const viewportHeight = event.layoutMeasurement.height;
      const contentHeight = event.contentSize.height;
      const isNearEnd = viewportHeight + offsetY >= contentHeight - 200;
      const shouldReport =
        Math.abs(offsetY - lastReportedOffsetY.value) >= SCROLL_UPDATE_THRESHOLD ||
        viewportHeight !== lastReportedViewportHeight.value ||
        isNearEnd;

      if (shouldReport) {
        lastReportedOffsetY.value = offsetY;
        lastReportedViewportHeight.value = viewportHeight;
        runOnJS(handleScrollMetrics)(offsetY, viewportHeight, contentHeight);
      }
    },
  });

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={animatedScrollHandler}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
        ) : undefined
      }
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header (search bar, filters, action buttons) */}
      {ListHeaderComponent ? (
        <View onLayout={handleHeaderLayout}>
          {ListHeaderComponent}
        </View>
      ) : null}

      {/* Two-column masonry layout or empty state */}
      {memories.length === 0 ? (
        ListEmptyComponent ? (
          <View style={{ paddingHorizontal: GRID_HORIZONTAL_PADDING, paddingTop: 32 }}>
            {ListEmptyComponent}
          </View>
        ) : null
      ) : (
        <View
          style={{
            flexDirection: 'row',
            gap: COLUMN_GAP,
            paddingHorizontal: GRID_HORIZONTAL_PADDING,
            height: masonryLayout.containerHeight,
          }}
        >
          {visibleColumns.map((col, colIndex) => (
            <View key={`col-${colIndex}`} style={{ flex: 1, height: masonryLayout.containerHeight, position: 'relative' }}>
              {col.map((entry) => (
                <MasonryGridItem
                  key={getMasonryItemKey(entry.item)}
                  entry={entry}
                  onMeasure={handleLayout}
                  onMemoryPress={onMemoryPress}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </Animated.ScrollView>
  );
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

function estimateMasonryMemoryHeight(memory: IMemory, columnWidth: number) {
  const seed = stableHash(memory._id || memory.title || '');
  const bannerMedia =
    memory.attachments?.find((attachment) => attachment.type?.startsWith('image/')) ??
    memory.attachments?.find((attachment) => attachment.type?.startsWith('video/'));
  const audioMedia = memory.attachments?.find((attachment) => attachment.type?.startsWith('audio/'));
  const bodyText = memory.body?.replace(/<[^>]+>/g, '').trim() ?? '';

  if (bannerMedia || (audioMedia && !bodyText)) {
    const aspectRatio = MEDIA_ASPECT_RATIOS[seed % MEDIA_ASPECT_RATIOS.length];
    return columnWidth / aspectRatio + ESTIMATED_TITLE_HEIGHT;
  }

  return TEXT_CARD_MIN_HEIGHTS[seed % TEXT_CARD_MIN_HEIGHTS.length] + ESTIMATED_TITLE_HEIGHT;
}

function getMasonryItemKey(memory: IMemory) {
  const firstAttachmentId = memory.attachments?.[0]?._id ?? 'none';
  return `${memory._id}-${firstAttachmentId}`;
}

const MasonryGridItem = React.memo(function MasonryGridItem({
  entry,
  onMeasure,
  onMemoryPress,
}: {
  entry: MasonryLayoutEntry<IMemory>;
  onMeasure: (id: string, height: number) => void;
  onMemoryPress?: (memory: IMemory) => void;
}) {
  const memory = entry.item;
  const handleItemLayout = useCallback((event: any) => {
    onMeasure(memory._id, event.nativeEvent.layout.height);
  }, [memory._id, onMeasure]);

  const handlePress = useCallback(() => {
    onMemoryPress?.(memory);
  }, [memory, onMemoryPress]);

  return (
    <View
      onLayout={handleItemLayout}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: entry.top,
      }}
    >
      <MasonryMemoryCard
        memory={memory}
        onPress={onMemoryPress ? handlePress : undefined}
      />
    </View>
  );
});
