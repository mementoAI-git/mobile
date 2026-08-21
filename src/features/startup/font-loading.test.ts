// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('startup font loading', () => {
  test('excludes unused families while retaining core fonts', async () => {
    const layout = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();
    const tokens = await Bun.file(new URL('../../constants/tokens.ts', import.meta.url)).text();

    for (const unused of ['AveriaSerifLibre_', 'Inter_400Regular', 'EBGaramond_400Regular', 'AzeretMono_400Regular']) {
      expect(layout).not.toContain(unused);
    }
    for (const unusedAlias of ['averia:', 'averiaBold:', 'georgia:']) {
      expect(tokens).not.toContain(unusedAlias);
    }
    for (const core of ['Geist_400Regular', 'Geist_500Medium', 'Geist_600SemiBold', 'Geist_700Bold']) {
      expect(layout).toContain(core);
    }
    expect(tokens).toContain("sans: 'Geist_400Regular'");
    expect(tokens).toContain("serif: 'Geist_400Regular'");
  });
});
