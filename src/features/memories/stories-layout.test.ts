import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const screen = readFileSync('app/(tabs)/stories/index.tsx', 'utf8');
const card = readFileSync('src/components/memory/MasonryMemoryCard.tsx', 'utf8');

describe('mobile stories layout', () => {
  test('removes the intro, divider-producing stats and Pending filter', () => {
    expect(screen).not.toContain('A secure archive');
    expect(screen).not.toContain('<StatCard');
    expect(screen).toContain("const FILTERS = ['All', 'Bookmarked', 'Deleted']");
  });
  test('keeps search and its view switch outside the scrolling list header', () => {
    const header = screen.slice(screen.indexOf('const listHeader'), screen.indexOf('const emptyState'));
    expect(header).not.toContain('<TextInput');
    expect(screen).toContain('accessibilityLabel="Search stories"');
    expect(screen).toContain('onPress={handleSwitchView}');
    expect(screen.indexOf('<TextInput')).toBeLessThan(screen.indexOf('<MasonryMemoryGrid'));
  });
  test('renders both grid and list modes with the same visible stories and filters', () => {
    expect(screen).toContain("viewMode === 'grid'");
    expect(screen).toContain('<Animated.FlatList');
    expect(screen).toContain('data={displayedStories}');
    expect(screen.match(/ListHeaderComponent={listHeader}/g)).toHaveLength(2);
    expect(screen).toContain('onScroll={scrollHandler}');
  });
  test('clips all story card media and surfaces to 14px corners', () => {
    expect(card).not.toMatch(/rounded-(?:t-)?\[(20|24)px\]/);
    expect(card).toContain('rounded-[14px]');
    expect(card).toContain('borderRadius={14}');
  });
});
