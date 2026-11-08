// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('chat composer backdrop', () => {
  test('matches the Overview dock blur with a theme-adaptive tint and fading edge', async () => {
    const source = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();
    const overviewDock = await Bun.file(new URL('../../components/TabBar.tsx', import.meta.url)).text();

    expect(source).toContain('useThemeStyles(createStyles)');
    expect(source).toContain('(COLORS: ThemeColors)');
    expect(source).toContain('style={styles.messageList}');
    const blur = '<BlurView tint={dark ? \'dark\' : \'light\'} intensity={90}';
    expect(source).toContain(blur);
    expect(overviewDock).toContain(blur);
    expect(source).toContain("const dark = useResolvedAppearance() === 'dark'");
    expect(source).toContain("colors={['transparent', COLORS.textInverse]}");
    expect(source).toContain('top: -64');
    expect(source).toContain("Platform.OS === 'ios' ? COLORS.glass : COLORS.popover");
    expect(source).toContain('style={[styles.composerBackdrop, { bottom: -insets.bottom }]}');
    expect(source).toContain('pointerEvents="none"');
  });

  test('extends the backdrop through the safe area while keeping the input above it', async () => {
    const source = await Bun.file(new URL('../../screens/ChatScreen.tsx', import.meta.url)).text();
    expect(source).toContain('const insets = useSafeAreaInsets()');
    expect(source).toContain('bottom: -insets.bottom');
    expect(source).toContain("edges={['top', 'bottom']}");
    expect(source).toContain('parentOwnsBottomSafeArea');
  });
});
