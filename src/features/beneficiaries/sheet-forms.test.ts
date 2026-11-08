import { describe, expect, test } from 'bun:test';
import {
  buildBeneficiaryInvitePayload,
  buildBeneficiaryUpdatePayload,
  buildGroupPayload,
  GROUP_COLOR_PALETTE,
} from './sheet-forms';

describe('person sheet form contracts (web parity)', () => {
  test('normalizes the invite fields and sends groups with shared-only access', () => {
    expect(buildBeneficiaryInvitePayload({
      email: '  HERRGROOT@GMAIL.COM ',
      name: '  Nsiyy Uwem ',
      relationship: ' Friend ',
      groupIds: ['group_1', 'group_2', 'group_1', ''],
    })).toEqual({
      email: 'herrgroot@gmail.com',
      name: 'Nsiyy Uwem',
      relationship: 'Friend',
      groups: ['group_1', 'group_2'],
      access_scope: 'shared_only',
    });
  });

  test('omits groups when none are chosen', () => {
    expect(buildBeneficiaryInvitePayload({
      email: 'person@example.com', name: 'Person', relationship: 'Friend', groupIds: [],
    })).toEqual({ email: 'person@example.com', name: 'Person', relationship: 'Friend', access_scope: 'shared_only' });
  });

  test('rejects incomplete and invalid invite values', () => {
    expect(buildBeneficiaryInvitePayload({ email: 'not-an-email', name: 'Person', relationship: 'Friend', groupIds: [] })).toBeNull();
    expect(buildBeneficiaryInvitePayload({ email: 'person@example.com', name: ' ', relationship: 'Friend', groupIds: [] })).toBeNull();
  });

  test('builds the edit payload from name, email and relationship', () => {
    expect(buildBeneficiaryUpdatePayload({ email: ' A@B.CO ', name: ' Ann ', relationship: ' Sister ' }))
      .toEqual({ email: 'a@b.co', name: 'Ann', relationship: 'Sister' });
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
