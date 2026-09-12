import { describe, expect, test } from 'bun:test';
import { buildAudienceRecipientItems } from './audience-recipient-items';

describe('audience recipient items', () => {
  const beneficiaries = [{ _id: 'b1', name: 'Ada', email: 'ada@example.com' }];
  const groups = [{ _id: 'g1', name: 'Family' }];

  test('contains only normalized API entities', () => {
    expect(buildAudienceRecipientItems(beneficiaries, groups, '')).toEqual([
      { id: 'b1', name: 'Ada', secondaryText: 'ada@example.com', kind: 'beneficiary', initial: 'A' },
      { id: 'g1', name: 'Family', kind: 'group', initial: 'F' },
    ]);
  });

  test('searches beneficiary email and names case-insensitively', () => {
    expect(buildAudienceRecipientItems(beneficiaries, groups, 'EXAMPLE.COM').map(item => item.id)).toEqual(['b1']);
    expect(buildAudienceRecipientItems(beneficiaries, groups, 'family').map(item => item.id)).toEqual(['g1']);
  });

  test('drops malformed entities instead of inventing fallbacks', () => {
    expect(buildAudienceRecipientItems([{ name: 'Missing id' }], [{ _id: '', name: 'Missing id' }], '')).toEqual([]);
  });
});
