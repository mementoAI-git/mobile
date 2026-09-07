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

  test('keeps every close action large enough to tap reliably', () => {
    const source = readFileSync('src/components/sheets/PublishPrivacySheet.tsx', 'utf8');
    expect(source).toContain('width: 44');
    expect(source).toContain('height: 44');
  });
});

describe('article audience wiring', () => {
  test('uses the shared payload and privacy sheet instead of a beneficiary-only menu', () => {
    const source = readFileSync('app/article.tsx', 'utf8');
    expect(source).toContain('buildArticlePublishPayload({');
    expect(source).toContain('<PublishPrivacySheet');
    expect(source).toContain('deriveMemoryAudience({})');
    expect(source).not.toContain('selectedBeneficiaryIds.length ? selectedBeneficiaryIds : undefined');
    expect(source).not.toContain('beneficiaryMenuOpen');
  });
});
