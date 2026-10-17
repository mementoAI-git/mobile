import { describe, expect, test } from 'bun:test';
import { getCategoryTopicsUrl, getNextTopicsPage } from './category-topics';

describe('Explore topic requests', () => {
  test('requests current categories for old links, without filtering all topics', () => {
    expect(getCategoryTopicsUrl('career', 1)).toBe('/prompts/categories/work-purpose?page=1');
  });
  test('requests answered topics independently on subsequent pages', () => {
    expect(getCategoryTopicsUrl('growing-up', 2, true)).toBe('/prompts/categories/growing-up?page=2&answered=true');
  });
  test('does not request unknown categories', () => {
    expect(getCategoryTopicsUrl('not-a-category', 1)).toBeNull();
  });
  test('stops at the end and follows server pagination', () => {
    expect(getNextTopicsPage({ hasNextPage: true, nextPage: 3, page: 1 })).toBe(3);
    expect(getNextTopicsPage({ hasNextPage: false, nextPage: null, page: 3 })).toBeUndefined();
    expect(getNextTopicsPage({ hasNextPage: true, nextPage: 1, page: 1 })).toBeUndefined();
  });
});
