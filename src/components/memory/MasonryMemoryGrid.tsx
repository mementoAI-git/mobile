import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { MasonryMemoryCard } from './MasonryMemoryCard';
import type { IMemory } from '@/types';
import { COLORS } from '@/constants/tokens';
import Animated from 'react-native-reanimated';

const COLUMN_COUNT = 2;
const COLUMN_GAP = 10; // px between the two columns
const CARD_GAP = 12;   // px between cards in the same column

interface MasonryMemoryGridProps {
  memories: IMemory[];
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  onMemoryPress?: (memory: IMemory) => void;
  onScroll?: (event: any) => void;
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
  onRefresh,
  ListHeaderComponent,
  onMemoryPress,
  onScroll,
}: MasonryMemoryGridProps) {
  // Map from memory._id → measured height in pixels
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});

  const handleLayout = useCallback((id: string, height: number) => {
    setMeasuredHeights((prev) => {
      if (prev[id] === height) return prev;
      return { ...prev, [id]: height };
    });
  }, []);

  // Distribute memories across columns, balancing by cumulative height once measured
  const columns = useMemo(() => {
    const cols: IMemory[][] = Array.from({ length: COLUMN_COUNT }, () => []);
    const colHeights = Array(COLUMN_COUNT).fill(0);

    memories.forEach((memory, index) => {
      const measured = measuredHeights[memory._id];
      const targetCol =
        measured == null
          ? index % COLUMN_COUNT                             // initial: round-robin
          : colHeights.indexOf(Math.min(...colHeights));     // after measure: shortest

      cols[targetCol].push(memory);
      colHeights[targetCol] += measured ?? 0;
    });

    return cols;
  }, [memories, measuredHeights]);

  const handleScroll = useCallback(
    (event: any) => {
      onScroll?.(event);
      const { nativeEvent } = event;
      if (nativeEvent) {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const paddingToBottom = 200;
        const isClose =
          layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
        if (isClose) {
          onEndReached?.();
        }
      }
    },
    [onEndReached, onScroll],
  );

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />
        ) : undefined
      }
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header (search bar, filters, action buttons) */}
      {ListHeaderComponent}

      {/* Two-column masonry layout */}
      <View style={{ flexDirection: 'row', gap: COLUMN_GAP, paddingHorizontal: 20 }}>
        {columns.map((col, colIndex) => (
          <View key={`col-${colIndex}`} style={{ flex: 1, gap: CARD_GAP }}>
            {col.map((memory) => (
              <View
                key={memory._id}
                onLayout={(e) => handleLayout(memory._id, e.nativeEvent.layout.height)}
              >
                <MasonryMemoryCard
                  memory={memory}
                  onPress={onMemoryPress ? () => onMemoryPress(memory) : undefined}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </Animated.ScrollView>
  );
}
