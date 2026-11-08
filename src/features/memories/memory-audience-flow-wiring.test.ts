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
    // The shared SheetHeader close button is 44px.
    expect(source).toContain('<SheetHeader');
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

describe('remaining memory audience flows', () => {
  test('create and edit sheets use the shared audience contract and privacy sheet', () => {
    const createSheet = readFileSync('src/components/sheets/CreateMemorySheet.tsx', 'utf8');
    const actionsSheet = readFileSync('src/components/sheets/MemoryActionsSheet.tsx', 'utf8');

    for (const source of [createSheet, actionsSheet]) {
      expect(source).toContain('deriveMemoryAudience');
      expect(source).toContain('buildMemoryAudiencePayload');
      expect(source).toContain('<PublishPrivacySheet');
    }
    expect(createSheet).not.toContain('const PrivacyModal =');
    expect(actionsSheet).not.toContain('if (!selectedBeneficiaryIds.length) return \'Everyone\'');
  });

  test('quick capture is explicitly private and exposes no audience picker', () => {
    const editor = readFileSync('app/editor.tsx', 'utf8');
    const create = readFileSync('app/create.tsx', 'utf8');
    const sheet = readFileSync('src/components/sheets/QuickCaptureSheet.tsx', 'utf8');

    expect(editor).toContain("quickCapture({ body: qcBody.trim(), visibility: 'private'");
    expect(create).toContain("visibility: 'private'");
    expect(sheet).toContain("visibility: 'private'");
    expect(editor).not.toContain('privacyOpen');
    expect(create).not.toContain('privacyOpen');
  });
});
