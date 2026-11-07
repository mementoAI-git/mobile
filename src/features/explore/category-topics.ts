import endpoint from '@/api/endpoint';
import { resolveExploreCategorySlug } from './category-identity';

export function getCategoryTopicsUrl(slug: string, page: number, answered?: boolean): string | null {
  const canonicalSlug = resolveExploreCategorySlug(slug);
  if (!canonicalSlug) return null;
  const params = new URLSearchParams({ page: String(page) });
  if (answered !== undefined) params.set('answered', String(answered));
  return `${endpoint.promptCategories}${canonicalSlug}?${params.toString()}`;
}

export function getNextTopicsPage(page: { hasNextPage: boolean; nextPage: number | null; page: number }): number | undefined {
  return page.hasNextPage && page.nextPage !== null && page.nextPage > page.page
    ? page.nextPage
    : undefined;
}
