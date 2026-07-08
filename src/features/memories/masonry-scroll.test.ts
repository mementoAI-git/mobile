// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { handleMasonryScroll } from './masonry-scroll';

const makeScrollEvent = (offsetY: number) => ({
  nativeEvent: {
    layoutMeasurement: { height: 600 },
    contentOffset: { y: offsetY },
    contentSize: { height: 1200 },
  },
});

describe('masonry scroll pagination', () => {
  test('forwards scroll events to the parent handler', () => {
    let receivedEvent = null;
    const event = makeScrollEvent(100);

    handleMasonryScroll(event, {
      onScroll: (nextEvent) => {
        receivedEvent = nextEvent;
      },
    });

    expect(receivedEvent).toBe(event);
  });

  test('triggers end reached near the bottom', () => {
    let calls = 0;

    handleMasonryScroll(makeScrollEvent(401), {
      onEndReached: () => {
        calls += 1;
      },
    });

    expect(calls).toBe(1);
  });

  test('does not trigger end reached before the threshold', () => {
    let calls = 0;

    handleMasonryScroll(makeScrollEvent(399), {
      onEndReached: () => {
        calls += 1;
      },
    });

    expect(calls).toBe(0);
  });
});
