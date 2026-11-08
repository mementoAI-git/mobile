// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  ENRICHMENT_FIELDS,
  INSIGHTS_SECTIONS,
  enrichmentFieldColor,
  formatDayMonth,
  formatSourceDate,
  observationSourcesUrl,
  sortSources,
  toObservationItem,
  withAlpha,
} from '../insights/insights-model';
import { countBeneficiaries, countSentCapsules } from '../insights/milestone-celebrations';

const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();

describe('My Insights screen', () => {
  test('is a full screen route with the web sections plus Milestones', async () => {
    const root = await read('../../../app/_layout.tsx');
    const screen = await read('../../../app/insights.tsx');

    expect(root).toContain('name="insights"');
    expect(INSIGHTS_SECTIONS.map((section) => section.label)).toEqual([
      'Observations',
      'Insights',
      'Preferences',
      'Enrichment fields',
      'Milestones',
    ]);
    expect(screen).toContain('useObservations()');
    expect(screen).toContain('<MemoryStatistics />');
    expect(screen).toContain('<InsightsPanel');
    expect(screen).toContain('<EnrichmentFieldsList');
    expect(screen).toContain('<MilestonesPanel />');
    expect(screen).toContain("router.push('/settings')");
    expect(screen).toContain("router.replace('/account')");
    expect(screen).toContain('TYPE.screenTitleAccent');
    expect(screen).not.toMatch(/text-gray-|text-slate-/);
  });

  test('opens notes named by ?observation= links and closes forgotten ones', async () => {
    const screen = await read('../../../app/insights.tsx');
    expect(screen).toContain('useLocalSearchParams<{ observation?: string; section?: string }>()');
    expect(screen).toContain("entry.kind !== 'observation' || ids.has(entry.item.id)");
    expect(screen).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(screen).toContain('toSection(params.section)');
  });

  test('offers Sources, Edit and Forget for each note through the sheet manager', async () => {
    const list = await read('../../components/insights/ObservationList.tsx');
    const sheet = await read('../../components/sheets/ObservationNoteSheet.tsx');
    const manager = await read('../../components/sheets/SheetManager.tsx');
    expect(list).toContain("openSheet('observation-note'");
    expect(manager).toContain("'observation-note': { component: ObservationNoteSheet");
    for (const label of ['Sources', 'Save changes', 'Forget note', 'Keep']) expect(sheet).toContain(label);
  });
});

describe('insights model', () => {
  test('lists all ten enrichment fields with a light and dark color each', () => {
    expect(ENRICHMENT_FIELDS).toHaveLength(10);
    expect(enrichmentFieldColor('identity_self', false)).toBe('#c23aa0');
    expect(enrichmentFieldColor('identity_self', true)).toBe('#e85fc6');
    expect(withAlpha('#c23aa0', 0.12)).toBe('#c23aa01f');
  });

  test('maps observations and builds their sources URL', () => {
    expect(
      toObservationItem({ id: 'a1', field: 'important_notes', heading: 'H', note: 'N', category_key: 'identity_self', source_count: 1 }),
    ).toEqual({ id: 'a1', title: 'H', detail: 'N', category: 'identity_self' });
    expect(observationSourcesUrl('a1')).toBe('/persona/observations/a1/sources');
  });

  test('sorts sources by date and formats dates the way web does', () => {
    const sources = [
      { id: 'old', title: 'Old', type: 'story', created_at: '2026-01-01T12:00:00.000Z', thumbnail: null },
      { id: 'new', title: 'New', type: 'conversation', created_at: '2026-09-12T12:00:00.000Z', thumbnail: null },
    ];
    expect(sortSources(sources, 'newest').map((s) => s.id)).toEqual(['new', 'old']);
    expect(sortSources(sources, 'oldest').map((s) => s.id)).toEqual(['old', 'new']);
    expect(formatDayMonth('2026-11-09T12:00:00.000Z')).toBe('9 Nov');
    expect(formatSourceDate('2026-05-18T12:00:00.000Z')).toBe('18 May, 2026');
    expect(formatSourceDate(null)).toBe('—');
  });

  test('counts sent capsules and beneficiaries from any list shape', () => {
    expect(countSentCapsules({ scheduled_count: 2, delivered_count: 1 })).toBe(3);
    expect(countSentCapsules(null)).toBe(0);
    expect(countBeneficiaries([{}, {}])).toBe(2);
    expect(countBeneficiaries({ totalDocs: 4, docs: [] })).toBe(4);
  });
});

describe('Insights in the side menu', () => {
  test('sits after Topics with the web light bulb icon', async () => {
    const menu = await read('../../components/navigation/AppMenuLayout.tsx');
    const icons = await read('../../constants/tab-icons.ts');
    expect(menu.indexOf("label: 'Insights', path: '/insights'")).toBeGreaterThan(menu.indexOf("label: 'Topics'"));
    expect(icons).toContain("insights: require('../../assets/images/icons/tab_insights.png')");
  });
});

describe('Account cards', () => {
  test('share a 20px radius and 20px padding', async () => {
    const account = await read('../../../app/account.tsx');
    const music = await read('../../components/account/MusicControllerCard.tsx');
    const streak = await read('../../components/account/WeeklyProgressCard.tsx');
    const score = await read('../../components/account/EnrichmentScoreCard.tsx');
    expect(account).toMatch(/padding: 20,\n\s+borderRadius: 20,/);
    expect(music).toContain('{ borderRadius: 20, padding: 20, gap: 8 }');
    for (const card of [streak, score]) {
      expect(card).toContain('borderRadius: 20,');
      expect(card).toContain('padding: 20,');
    }
  });

  test('profile is white on dark themes, streak uses fill weak, score is a word on the title line', async () => {
    const account = await read('../../../app/account.tsx');
    const streak = await read('../../components/account/WeeklyProgressCard.tsx');
    const score = await read('../../components/account/EnrichmentScoreCard.tsx');
    expect(account).toContain("backgroundColor: profileOnWhite ? LIGHT_COLORS.card : COLORS.fillWeak");
    expect(streak).toContain('backgroundColor: COLORS.fillWeak,');
    expect(score).toContain('>{strength}<');
    expect(score).not.toContain('{safeScore}%');
    expect(score).toContain('...TYPE.bodyLarge');
    expect(score).toContain('...TYPE.bodySmall');
    expect(score).toContain('...TYPE.bodyLargeSemi');
    // Title and strength share the first line; the description fills the width below.
    expect(score.indexOf('>Enrichment score<')).toBeLessThan(score.indexOf('>{strength}<'));
    expect(score.indexOf('>{strength}<')).toBeLessThan(score.indexOf('memory health across'));
    expect(score.indexOf('memory health across')).toBeLessThan(score.indexOf('styles.progressTrack'));
  });
});

describe('Media viewer', () => {
  test('uses a theme-adaptive backdrop, raised header buttons and visible inactive dots', async () => {
    const viewer = await read('../../components/ui/MediaPreviewModal.tsx');
    const { COLORS } = await import('../../constants/tokens');
    const { DARK_COLORS, DEEP_SKY_COLORS, DEEP_SKY } = await import('../../constants/appearance');
    expect(viewer).toContain('backgroundColor: COLORS.mediaViewer');
    expect(viewer).toContain('style={[styles.iconBtn, { backgroundColor: COLORS.cardRaised }]}');
    expect(viewer).toContain('{ backgroundColor: COLORS.strokeStrong, width: 8, height: 8 }');
    expect(COLORS.mediaViewer).not.toBe(COLORS.background);
    expect(DARK_COLORS.mediaViewer).toBe('#0b0c10');
    expect(DEEP_SKY_COLORS.mediaViewer).toBe(DEEP_SKY.canvas);
  });
});
