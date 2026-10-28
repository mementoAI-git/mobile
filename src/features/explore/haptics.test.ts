// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('explore haptic ownership', () => {
  test('keeps haptics in pressed controls instead of navigation callbacks', async () => {
    const exploreLogic = await Bun.file(
      new URL('../../hooks/use-explore-logic.ts', import.meta.url),
    ).text();
    const categoryLogic = await Bun.file(
      new URL('../../hooks/use-category-prompts-logic.ts', import.meta.url),
    ).text();
    const categoryScreen = await Bun.file(
      new URL('../../../app/(tabs)/explore/[id].tsx', import.meta.url),
    ).text();

    expect(exploreLogic).not.toContain('expo-haptics');
    expect(categoryLogic).not.toContain('expo-haptics');
    const questionCard = await Bun.file(new URL('../../components/explore/ExploreQuestionCard.tsx', import.meta.url)).text();
    expect(questionCard).toContain('Haptics.impactAsync');
    expect(categoryScreen).toContain('Haptics.selectionAsync');
  });
});
