import { describe, expect, test } from 'bun:test';

const read = (path: string) => Bun.file(new URL(`../../${path}`, import.meta.url)).text();

describe('capsule theme fonts', () => {
  test('handwriting fonts are not loaded at app launch', async () => {
    const layout = await read('app/_layout.tsx');

    for (const font of ['PatrickHandSC', 'Handlee', 'CutiveMono', 'Portrait-script']) {
      expect(layout).not.toContain(font);
    }
  });

  test('every capsule screen loads them before showing a theme', async () => {
    const files = [
      'src/components/capsule/CapsuleCard.tsx',
      'src/components/capsule/StylePicker.tsx',
      'src/components/sheets/CreateCapsuleSheet.tsx',
      'src/components/sheets/CapsuleSealedSheet.tsx',
      'src/components/sheets/PreviewCapsuleModal.tsx',
      'src/components/sheets/CapsuleDetailSheet.tsx',
    ];
    for (const file of files) {
      expect(await read(file)).toContain('useCapsuleThemeFonts();');
    }
  });

  test('the hook registers every family name the capsule themes use', async () => {
    const themes = await read('src/constants/themes.ts');
    const hook = await read('src/hooks/use-capsule-theme-fonts.ts');
    for (const family of ['Patrick Hand SC', 'Handlee', 'Portrait Script', 'Cutive']) {
      expect(themes).toContain(`'${family}'`);
      expect(hook).toMatch(new RegExp(`'?${family}'?:`));
    }
  });
});
