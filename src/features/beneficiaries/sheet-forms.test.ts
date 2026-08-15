import { describe, expect, test } from 'bun:test';
import {
  buildBeneficiaryInvitePayload,
  buildGroupPayload,
  GROUP_COLOR_PALETTE,
} from './sheet-forms';

describe('beneficiary sheet form contracts', () => {
  test('normalizes every functional invite field for the atomic API payload', () => {
    expect(buildBeneficiaryInvitePayload({
      email: '  HERRGROOT@GMAIL.COM ',
      name: '  Nsiyy Uwem ',
      relationship: ' Friend ',
      about: ' Close friend from university. ',
      avatarFileId: ' file_123 ',
      groupIds: ['group_1', 'group_2', 'group_1', ''],
    })).toEqual({
      email: 'herrgroot@gmail.com',
      name: 'Nsiyy Uwem',
      relationship: 'Friend',
      about: 'Close friend from university.',
      avatar_file_id: 'file_123',
      group_ids: ['group_1', 'group_2'],
    });
  });

  test('omits empty optional invite fields', () => {
    expect(buildBeneficiaryInvitePayload({
      email: 'person@example.com',
      name: 'Person',
      relationship: 'Friend',
      about: ' ',
      avatarFileId: '',
      groupIds: [],
    })).toEqual({
      email: 'person@example.com',
      name: 'Person',
      relationship: 'Friend',
    });
  });

  test('rejects incomplete and invalid invite values', () => {
    expect(buildBeneficiaryInvitePayload({
      email: 'not-an-email', name: 'Person', relationship: 'Friend', about: '', groupIds: [],
    })).toBeNull();
    expect(buildBeneficiaryInvitePayload({
      email: 'person@example.com', name: ' ', relationship: 'Friend', about: '', groupIds: [],
    })).toBeNull();
  });
});

describe('group sheet form contracts', () => {
  test('provides the six stable reference colours', () => {
    expect(GROUP_COLOR_PALETTE).toHaveLength(6);
    expect(GROUP_COLOR_PALETTE.map((item) => item.id)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test('normalizes group fields and preserves the selected colour index', () => {
    expect(buildGroupPayload({ name: ' Family ', description: ' Immediate family ', color: 1 })).toEqual({
      name: 'Family',
      description: 'Immediate family',
      color: 1,
    });
    expect(buildGroupPayload({ name: 'Family', description: ' ', color: 5 })).toEqual({
      name: 'Family',
      color: 5,
    });
  });

  test('rejects missing names and out-of-range colour indices', () => {
    expect(buildGroupPayload({ name: ' ', description: '', color: 1 })).toBeNull();
    expect(buildGroupPayload({ name: 'Family', description: '', color: 6 })).toBeNull();
    expect(buildGroupPayload({ name: 'Family', description: '', color: -1 })).toBeNull();
  });
});
