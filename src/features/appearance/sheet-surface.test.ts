import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Glob } from 'bun';
import { COLORS } from '@/constants/tokens';
import { DARK_COLORS, DEEP_SKY_COLORS } from '@/constants/appearance';

const root = join(import.meta.dir, '../../..');
const sources = [...new Glob('{app,src}/**/*.tsx').scanSync(root)]
  .filter((path) => !path.includes('.test.'))
  .map((path) => [path, readFileSync(join(root, path), 'utf8')] as const);

describe('bottom sheet surface', () => {
  test('fill matches web --bg-raised / --bg-sheet per theme', () => {
    expect(COLORS.sheet).toBe('#ffffff');
    expect(DARK_COLORS.sheet).toBe('#12131a');
    // Deep Sky sheets share the Dark mode sheet fill.
    expect(DEEP_SKY_COLORS.sheet).toBe(DARK_COLORS.sheet);
  });

  test('backdrop matches web --overlay-backdrop on light and dark', async () => {
    const { SHEET_BACKDROP } = await import('../layout/sheet-presentation');
    expect(SHEET_BACKDROP.dark).toEqual({ color: 'rgb(64,66,76)', opacity: 0.55 });
    expect(SHEET_BACKDROP.light).toEqual({ color: 'rgb(94,94,94)', opacity: 0.5 });
    const source = readFileSync(join(root, 'src/components/sheets/SheetBackdrop.tsx'), 'utf8');
    expect(source).toContain('backgroundColor: backdrop.color');
  });

  test('every sheet uses the shared backdrop and the sheet fill', () => {
    for (const [path, source] of sources) {
      if (path.endsWith('SheetBackdrop.tsx')) continue;
      expect(source.includes('<BottomSheetBackdrop'), path).toBe(false);
      for (const match of source.matchAll(/backgroundStyle=\{([^\n]*)\}\n/g)) {
        // Either inline (`colors.sheet`) or via a themed style factory that sets `backgroundColor: COLORS.sheet`.
        const usesSheetFill = /\.sheet\b/.test(match[1]) || /backgroundColor: COLORS\.sheet,/.test(source);
        expect(usesSheetFill, `${path}: ${match[1]}`).toBe(true);
      }
    }
  });
});
