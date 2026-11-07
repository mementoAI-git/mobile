import { describe, expect, test } from 'bun:test';
import { resolveExploreCatalog } from './explore-catalog';
import { resolveExploreCategorySlug } from './category-identity';

describe('Explore catalog parity', () => {
  test('falls back to the eleven approved web categories for legacy or missing data', () => {
    for (const data of [undefined, [], ['career', 'region'], [{ slug: 'who-i-am' }]]) {
      const result = resolveExploreCatalog(data);
      expect(result.usingBundledCatalog).toBe(true);
      expect(result.categories).toHaveLength(11);
      expect(result.categories[0].title).toBe('Growing Up');
      expect(result.categories[10].title).toBe("What's Ahead");
      expect(result.categories.find(c => c.slug === 'beliefs-faith')?.description).toContain('Religion');
    }
  });

  test('keeps the API catalog titles and descriptions when its schema is current', () => {
    const categories = [{ slug: 'who-i-am' as const, title: 'Who I Am', description: 'Identity', order: 4, starterTotal: 10 }];
    expect(resolveExploreCatalog(categories)).toEqual({ categories, usingBundledCatalog: false });
  });

  test('does not accept unknown category slugs as current catalog data', () => {
    expect(resolveExploreCatalog([{ slug: 'unknown', title: 'Unknown', description: 'Unknown', order: 0, starterTotal: 10 }]).usingBundledCatalog).toBe(true);
  });
});

describe('Explore legacy links', () => {
  test('maps legacy links to their canonical web categories', () => {
    expect(resolveExploreCategorySlug('career')).toBe('work-purpose');
    expect(resolveExploreCategorySlug('family')).toBe('people-i-love');
    expect(resolveExploreCategorySlug('region')).toBe('beliefs-faith');
    expect(resolveExploreCategorySlug('life-transition')).toBe('what-life-taught-me');
    expect(resolveExploreCategorySlug('experience-culture')).toBe('stories-adventures');
  });

  test('normalizes current links and rejects unknown routes', () => {
    expect(resolveExploreCategorySlug(' WHO-I-AM ')).toBe('who-i-am');
    expect(resolveExploreCategorySlug('not-a-category')).toBeNull();
    expect(resolveExploreCategorySlug('constructor')).toBeNull();
    expect(resolveExploreCategorySlug('__proto__')).toBeNull();
  });
});
