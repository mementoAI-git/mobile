// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('startup font loading', () => {
  test('excludes unused families while retaining core fonts', async () => {
    const layout = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();
    const tokens = await Bun.file(new URL('../../constants/tokens.ts', import.meta.url)).text();

    for (const unused of ['AveriaSerifLibre_', 'Geist_400Regular', 'Geist_700Bold']) {
      expect(layout).not.toContain(unused);
    }
    for (const unusedAlias of ['averia:', 'averiaBold:', 'geist:', 'geistBold:']) {
      expect(tokens).not.toContain(unusedAlias);
    }
    for (const core of ['Inter_400Regular', 'Inter_700Bold', 'EBGaramond_400Regular', 'EBGaramond_700Bold']) {
      expect(layout).toContain(core);
    }
  });
});
