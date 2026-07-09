// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  buildMasonryColumnLayout,
  getVisibleMasonryColumnLayout,
} from './masonry-layout';

const makeMemory = (id: string) => ({ _id: id, title: id, attachments: [], body: '', tags: [] });

describe('masonry layout', () => {
  test('places unmeasured cards round-robin while reserving estimated height', () => {
    const layout = buildMasonryColumnLayout({
      items: [makeMemory('a'), makeMemory('b'), makeMemory('c'), makeMemory('d')],
      measuredHeights: {},
      estimateHeight: () => 100,
      columnCount: 2,
      gap: 10,
    });

    expect(layout.columns.map((column) => column.map((entry) => entry.item._id))).toEqual([
      ['a', 'c'],
      ['b', 'd'],
    ]);
    expect(layout.columnHeights).toEqual([210, 210]);
    expect(layout.containerHeight).toBe(210);
  });

  test('places measured cards in the currently shortest column', () => {
    const layout = buildMasonryColumnLayout({
      items: [makeMemory('a'), makeMemory('b'), makeMemory('c')],
      measuredHeights: { a: 300, b: 120, c: 80 },
      estimateHeight: () => 100,
      columnCount: 2,
      gap: 10,
    });

    expect(layout.columns.map((column) => column.map((entry) => entry.item._id))).toEqual([
      ['a'],
      ['b', 'c'],
    ]);
    expect(layout.columnHeights).toEqual([300, 210]);
  });

  test('filters column entries to the visible overscanned window', () => {
    const layout = buildMasonryColumnLayout({
      items: [makeMemory('a'), makeMemory('b'), makeMemory('c'), makeMemory('d')],
      measuredHeights: {},
      estimateHeight: () => 100,
      columnCount: 2,
      gap: 10,
    });

    const visible = getVisibleMasonryColumnLayout({
      columns: layout.columns,
      windowTop: 105,
      windowBottom: 180,
      overscan: 0,
    });

    expect(visible.map((column) => column.map((entry) => entry.item._id))).toEqual([
      ['c'],
      ['d'],
    ]);
  });
});
