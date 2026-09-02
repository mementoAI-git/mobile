import { get } from './mutations';
import {
  normalizeCollectionResponse,
  normalizeEntityResponse,
  normalizePaginatedResponse,
} from './domain-adapters';

function paginationDefaults(url: string) {
  const parsed = new URL(url, 'https://memento.local');
  const page = Number(parsed.searchParams.get('page'));
  const limit = Number(parsed.searchParams.get('limit'));
  return {
    page: Number.isFinite(page) && page > 0 ? page : undefined,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  };
}

export async function fetchEntity<T>(url: string): Promise<T | null> {
  return normalizeEntityResponse<T>(await get<unknown>(url)).data;
}

export async function fetchCollection<T>(url: string): Promise<T[]> {
  return normalizeCollectionResponse<T>(await get<unknown>(url)).data;
}

export async function fetchPaginated<T>(url: string) {
  return normalizePaginatedResponse<T>(
    await get<unknown>(url),
    paginationDefaults(url),
  ).data;
}

export async function fetchAllPaginated<T>(url: string, limit = 100): Promise<T[]> {
  const resolved = new URL(url, 'https://memento.local');
  resolved.searchParams.set('limit', String(limit));
  const docs: T[] = [];
  let page = 1;

  for (let requestCount = 0; requestCount < 100; requestCount += 1) {
    resolved.searchParams.set('page', String(page));
    const requestUrl = `${resolved.pathname}${resolved.search}`;
    const result = await fetchPaginated<T>(requestUrl);
    docs.push(...result.docs);
    if (!result.hasNextPage || result.nextPage === null) break;
    if (result.nextPage <= page) break;
    page = result.nextPage;
  }

  return docs;
}
