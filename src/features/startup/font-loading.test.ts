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
    expect(tokens).toContain('sans: BODY_FONT');
    expect(tokens).toContain('chatBody: BODY_FONT');
    const iosBodyFont = await Bun.file(new URL('../../constants/body-font.ios.ts', import.meta.url)).text();
    const androidBodyFont = await Bun.file(new URL('../../constants/body-font.ts', import.meta.url)).text();
    expect(iosBodyFont).toContain("BODY_FONT = 'ui-rounded'");
    expect(androidBodyFont).toContain("BODY_FONT = 'Inter_400Regular'");
    expect(iosBodyFont).toContain("BODY_BOLD_FONT = 'ui-rounded'");
    expect(androidBodyFont).toContain("BODY_BOLD_FONT = 'Inter_700Bold'");
    expect(tokens).toContain("serif: 'EBGaramond_400Regular'");
    expect(tokens).toContain("mono: 'AzeretMono_400Regular'");
  });

  test('imports only the font weights used by the app', async () => {
    const layout = await Bun.file(new URL('../../../app/_layout.tsx', import.meta.url)).text();

    for (const packageName of [
      'inter',
      'eb-garamond',
      'azeret-mono',
      'patrick-hand-sc',
      'handlee',
      'cutive-mono',
      'geist',
    ]) {
      expect(layout).not.toContain(`from '@expo-google-fonts/${packageName}';`);
    }
    expect(layout).toContain("from '@expo-google-fonts/inter/400Regular'");
    expect(layout).toContain("from '@expo-google-fonts/eb-garamond/400Regular_Italic'");
    expect(layout).toContain("import { useFonts } from 'expo-font'");
  });

  test('uses the warm journal background in JS and NativeWind tokens', async () => {
    const tokens = await Bun.file(new URL('../../constants/tokens.ts', import.meta.url)).text();
    const tailwind = await Bun.file(new URL('../../../tailwind.config.ts', import.meta.url)).text();

    expect(tokens).toContain("background: '#ffffff'");
    expect(tailwind).toContain("background: 'var(--surface-background)'");
    const appearance = await Bun.file(new URL('../../constants/appearance.ts', import.meta.url)).text();
    expect(appearance).toContain("'--surface-background': 'background'");
  });
});
