import { describe, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { returnFromStory } from './story-navigation';

const detailScreen = readFileSync('app/(tabs)/stories/[id].tsx', 'utf8');
const detailLogic = readFileSync('src/hooks/use-story-detail-logic.ts', 'utf8');

describe('story return navigation', () => {
  test('targets the story list even when another tab has back history', () => {
    const router = { dismissTo: mock(() => {}), canGoBack: mock(() => true), back: mock(() => {}) };
    returnFromStory(router, false);
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/stories');
    expect(router.back).not.toHaveBeenCalled();
  });

  test('targets the story list when a direct story link has no back history', () => {
    const router = { dismissTo: mock(() => {}), canGoBack: mock(() => false), back: mock(() => {}) };
    returnFromStory(router, false);
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/stories');
  });

  test('preserves the overview return destination for stories opened from there', () => {
    const router = { dismissTo: mock(() => {}) };
    returnFromStory(router, true);
    expect(router.dismissTo).toHaveBeenCalledWith('/(tabs)/overview');
  });

  test('uses the same return behavior for Back and successful deletion', () => {
    expect(detailScreen).toContain('returnFromStory(router, returnToOverview)');
    expect(detailLogic).toContain("returnFromStory(router, from === 'overview')");
    expect(detailScreen).not.toContain('router.canGoBack()');
    expect(detailLogic).not.toContain('router.canGoBack()');
  });

  test('anchors direct links to the list and resets the nested tab on blur', () => {
    const stack = readFileSync('app/(tabs)/stories/_layout.tsx', 'utf8');
    const tabs = readFileSync('app/(tabs)/_layout.tsx', 'utf8');
    expect(stack).toMatch(/initialRouteName:\s*['"]index['"]/);
    expect(tabs).toContain("popToTopOnBlur: shouldPopTabToTopOnBlur('stories')");
  });
});
