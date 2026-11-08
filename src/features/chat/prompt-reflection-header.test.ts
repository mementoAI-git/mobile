// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('PromptReflectionHeader component', () => {
  test('uses design tokens, accessibility, and collapsible animation contract', async () => {
    const source = await Bun.file(
      new URL('../../components/chat/PromptReflectionHeader.tsx', import.meta.url),
    ).text();

    expect(source).toContain("from '@/constants/tokens'");
    expect(source).toContain('COLORS.fillWeak');
    expect(source).toContain('TYPE.cardTitle');
    expect(source).toContain('getExploreCategoryTitle');
    expect(source).toContain('getQuestionIdenticonUrl');
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('Share topic');
    expect(source).toContain('Bookmark topic');
    expect(source).toContain('disabled={!memoryId}');
    expect(source).toContain('accessibilityState={{ expanded: isExpanded }}');
    expect(source).toContain('LayoutAnimation');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('numberOfLines={1}');
    expect(source).not.toMatch(/text-gray-|text-slate-/);
  });

  test('titles reflection conversations Reflection and shows the customizable digital mind for host conversations', async () => {
    const screen = await Bun.file(
      new URL('../../screens/ChatScreen.tsx', import.meta.url),
    ).text();

    expect(screen).toContain('style={styles.headerTitle}>Reflection</Text> : <DigitalMindHeader />');
  });
});
