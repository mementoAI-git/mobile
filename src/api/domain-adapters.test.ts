import { describe, expect, test } from 'bun:test';
import {
  normalizeCollectionResponse,
  normalizeEntityResponse,
  normalizePaginatedResponse,
} from './domain-adapters';

describe('mobile domain response adapters', () => {
  test('keeps canonical entities and unwraps one legacy data layer', () => {
    expect(normalizeEntityResponse({ data: { tier: 'pro' } }).data).toEqual({ tier: 'pro' });
    expect(normalizeEntityResponse({ data: { data: { tier: 'legacy' } } }).data).toEqual({ tier: 'legacy' });
  });

  test('normalizes raw, canonical, paginated, and nested legacy collections', () => {
    expect(normalizeCollectionResponse<string>(['raw']).data).toEqual(['raw']);
    expect(normalizeCollectionResponse<string>({ data: ['canonical'] }).data).toEqual(['canonical']);
    expect(normalizeCollectionResponse<string>({ data: { docs: ['page'] } }).data).toEqual(['page']);
    expect(normalizeCollectionResponse<string>({ data: { data: ['legacy'] } }).data).toEqual(['legacy']);
  });

  test('supplies safe pagination metadata for legacy arrays without losing canonical pages', () => {
    const canonical = normalizePaginatedResponse<{ _id: string }>({
      data: {
        docs: [{ _id: 'one' }],
        page: 2,
        limit: 10,
        totalDocs: 11,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
        nextPage: null,
        prevPage: 1,
        pagingCounter: 11,
      },
    });
    expect(canonical.data).toMatchObject({ page: 2, docs: [{ _id: 'one' }], hasNextPage: false });

    expect(normalizePaginatedResponse([{ _id: 'legacy' }], { page: 3, limit: 25 }).data).toMatchObject({
      docs: [{ _id: 'legacy' }],
      page: 3,
      limit: 25,
      totalDocs: 1,
      hasNextPage: false,
    });
  });
});
