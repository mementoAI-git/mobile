// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('startup font loading', () => {
  test('loads the design-system families and maps root tokens to them', async () => {
    const layout = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();
    const tokens = await Bun.file(new URL('../../constants/tokens.ts', import.meta.url)).text();

    for (const unusedAlias of ['averia:', 'averiaBold:', 'georgia:']) {
      expect(tokens).not.toContain(unusedAlias);
    }
    for (const core of [
      'Inter_400Regular',
      'Inter_500Medium',
      'Inter_600SemiBold',
      'Inter_700Bold',
      'EBGaramond_400Regular',
      'EBGaramond_500Medium',
      'EBGaramond_700Bold',
      'AzeretMono_400Regular',
    ]) {
      expect(layout).toContain(core);
    }
    expect(tokens).toContain("sans: 'Inter_400Regular'");
    expect(tokens).toContain("serif: 'EBGaramond_400Regular'");
    expect(tokens).toContain("mono: 'AzeretMono_400Regular'");
  });

  test('uses the warm journal background in JS and NativeWind tokens', async () => {
    const tokens = await Bun.file(new URL('../../constants/tokens.ts', import.meta.url)).text();
    const tailwind = await Bun.file(new URL('../../../tailwind.config.ts', import.meta.url)).text();

    expect(tokens).toContain("background: '#ffffff'");
    expect(tailwind).toContain("background: '#ffffff'");
  });
});
