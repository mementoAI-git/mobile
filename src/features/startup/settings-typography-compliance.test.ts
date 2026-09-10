import { readFileSync } from 'node:fs';
import { Glob } from 'bun';
import { describe, expect, test } from 'bun:test';

const patterns = [
  'app/settings/**/*.tsx',
  'src/components/account/**/*.tsx',
  'src/components/billing/**/*.tsx',
  'src/components/sheets/**/*.tsx',
];

describe('settings and management typography compliance', () => {
  test('does not retain the feature-specific typography authority', async () => {
    for (const pattern of patterns) {
      for await (const file of new Glob(pattern).scan('.')) {
        const source = readFileSync(file, 'utf8');
        expect(source).not.toContain('settings-typography');
        expect(source).not.toContain('SETTINGS_TYPE');
      }
    }
  });
});
