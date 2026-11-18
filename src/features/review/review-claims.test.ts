import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { PRO_FEATURES } from '@/features/billing/plan-state';

const read = (path: string) => readFileSync(path, 'utf8');

/** App Review 2.3.1 / 5.1.1: describe only features that ship and privacy we can stand behind. */
describe('store-review claims', () => {
  test('the paywall lists only features that ship', () => {
    expect(PRO_FEATURES as readonly string[]).not.toContain('Supermemory integration');
    expect(read('app/(onboard)/index.tsx')).not.toContain('speaks in your voice');
  });

  test('no absolute privacy claims', () => {
    for (const path of [
      'app/(onboard)/index.tsx',
      'src/components/sheets/GuardianLensSheet.tsx',
      'src/features/export/memoir-html-generator.ts',
    ]) {
      const source = read(path).toLowerCase();
      expect(source).not.toContain('zero-knowledge');
      expect(source).not.toContain('end-to-end');
      expect(source).not.toContain('only visible to you');
    }
  });
});
