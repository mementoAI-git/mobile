// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('PromptReflectionHeader component', () => {
  test('uses design tokens, accessibility, and collapsible animation contract', async () => {
    const source = await Bun.file(
      new URL('../../components/chat/PromptReflectionHeader.tsx', import.meta.url),
    ).text();

    expect(source).toContain("from '@/constants/tokens'");
    expect(source).toContain('COLORS.brand');
    expect(source).toContain('FONTS.serif');
    expect(source).toContain('FONTS.sansBold');
    expect(source).toContain('LayoutAnimation');
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain('numberOfLines={1}');
    expect(source).not.toMatch(/text-gray-|text-slate-/);
  });
});
