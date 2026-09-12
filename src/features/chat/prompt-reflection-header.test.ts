// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('PromptReflectionHeader component', () => {
  test('uses design tokens, accessibility, and collapsible animation contract', async () => {
    const source = await Bun.file(
      new URL('../../components/chat/PromptReflectionHeader.tsx', import.meta.url),
    ).text();

    expect(source).toContain("from '@/constants/tokens'");
    expect(source).toContain('COLORS.brand');
    expect(source).toContain('TYPE.cardTitle');
    expect(source).toContain('TYPE.eyebrow');
    expect(source).toContain('LayoutAnimation');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('numberOfLines={1}');
    expect(source).not.toMatch(/text-gray-|text-slate-/);
  });

  test('titles prompt conversations as "Prompt" and host conversations as "Chat"', async () => {
    const screen = await Bun.file(
      new URL('../../screens/ChatScreen.tsx', import.meta.url),
    ).text();

    expect(screen).toContain("{isPromptType ? 'Prompt' : 'Chat'}");
  });
});
