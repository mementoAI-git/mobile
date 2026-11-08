import { describe, expect, test } from 'bun:test';
import { groupCardDetails, personCardDetails } from './people-cards';

describe('People & groups cards (web parity)', () => {
  test('shows relationship and invite status', () => {
    expect(personCardDetails({ relationship: 'friend' })).toEqual(['Friend', 'Invite pending']);
    expect(personCardDetails({ relationship: 'Dad', accepted_at: '2026-10-02T10:00:00Z' })).toEqual(['Dad', 'Added Oct 2, 2026']);
    expect(personCardDetails({ relationship: '', accepted_at: '2026-10-02T10:00:00Z' })).toEqual(['Added Oct 2, 2026']);
  });

  test('shows created date and people count for groups', () => {
    expect(groupCardDetails({ _id: 'g', name: 'Family', created_at: '2026-09-15T10:00:00Z', members: ['a'] } as any))
      .toEqual(['Created Sep 15, 2026', '1 person']);
    expect(groupCardDetails({ _id: 'g', name: 'Family' } as any, 3)).toEqual(['3 people']);
  });
});

describe('People & groups screen', () => {
  test('matches web: title, tabs, no status filter', async () => {
    const screen = await Bun.file(new URL('../../../app/settings/beneficiaries.tsx', import.meta.url)).text();
    expect(screen).toContain('title="People &"');
    expect(screen).toContain('accent="groups"');
    expect(screen).toContain('Invite person');
    expect(screen).toContain('New group');
    expect(screen).not.toContain('filterBeneficiaries');
    expect(screen).not.toContain("'all', 'active', 'pending'");
  });
});

describe('group membership', () => {
  const { isGroupMember, membershipChanges } = require('./people-cards');
  test('counts people listed on the group or carrying it in their groups', () => {
    expect(isGroupMember({ _id: 'a', groups: [] }, { _id: 'g', members: ['a'] }, 'g')).toBe(true);
    expect(isGroupMember({ _id: 'b', groups: [{ _id: 'g' }] }, { _id: 'g', members: [] }, 'g')).toBe(true);
    expect(isGroupMember({ _id: 'c', groups: ['x'] }, { _id: 'g', members: [] }, 'g')).toBe(false);
  });
  test('works out what to add and remove', () => {
    expect(membershipChanges(new Set(['a', 'b']), new Set(['b', 'c']))).toEqual({ add: ['c'], remove: ['a'] });
    expect(membershipChanges(new Set(['a']), new Set(['a']))).toEqual({ add: [], remove: [] });
  });
});
