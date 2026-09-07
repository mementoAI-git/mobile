import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('publish privacy sheet production safety', () => {
  test('does not ship invented identities', () => {
    const source = readFileSync('src/components/sheets/PublishPrivacySheet.tsx', 'utf8');
    for (const forbidden of ['SAMPLE_BENEFICIARIES', 'SAMPLE_GROUPS', 'Alexander Wang', 'Bojanovic', '@Church', '@Victor', '@Fela']) {
      expect(source.includes(forbidden)).toBe(false);
    }
  });

  test('uses design tokens instead of raw hex colors', () => {
    const source = readFileSync('src/components/sheets/PublishPrivacySheet.tsx', 'utf8');
    expect(source.match(/#[0-9a-f]{6}/gi) ?? []).toEqual([]);
  });
});
