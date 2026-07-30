// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  getGroupMemberCount,
  normalizeCollection,
} from './collections';

describe('beneficiary collection normalization', () => {
  test('accepts arrays, paginated responses, and nested API data', () => {
    const people = [{ _id: 'person-1' }];

    expect(normalizeCollection(people)).toEqual(people);
    expect(normalizeCollection({ docs: people })).toEqual(people);
    expect(normalizeCollection({ data: people })).toEqual(people);
    expect(normalizeCollection({ data: { docs: people } })).toEqual(people);
  });

  test('returns an empty list for missing or malformed collections', () => {
    expect(normalizeCollection(undefined)).toEqual([]);
    expect(normalizeCollection({ data: null })).toEqual([]);
  });

  test('counts populated and identifier-only group members', () => {
    expect(getGroupMemberCount({ members: ['one', 'two'] } as any)).toBe(2);
    expect(getGroupMemberCount({ members: [{ _id: 'one' }] } as any)).toBe(1);
    expect(getGroupMemberCount({} as any)).toBe(0);
  });
});
