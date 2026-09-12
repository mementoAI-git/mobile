import { describe, expect, test } from 'bun:test';
import {
  buildMemoryAudiencePayload,
  canApplyMemoryAudience,
  deriveMemoryAudience,
  formatMemoryAudienceLabel,
  type MemoryAudiencePayload,
  type MemoryAudienceSelection,
} from './memory-audience';

describe('memory audience API payload', () => {
  const cases: Array<
    [string, MemoryAudienceSelection, MemoryAudiencePayload]
  > = [
    [
      'private clears stale recipients',
      {
        mode: 'private',
        beneficiaryIds: ['beneficiary-1'],
        groupIds: ['group-1'],
      },
      {
        visibility: 'private',
        beneficiaries: [],
        groups: [],
      },
    ],
    [
      'everyone is explicitly public and clears stale recipients',
      {
        mode: 'everyone',
        beneficiaryIds: ['beneficiary-1'],
        groupIds: ['group-1'],
      },
      {
        visibility: 'everyone',
        beneficiaries: [],
        groups: [],
      },
    ],
    [
      'specific remains private and deduplicates recipients',
      {
        mode: 'specific',
        beneficiaryIds: ['beneficiary-1', 'beneficiary-1', ''],
        groupIds: ['group-1', 'group-1'],
      },
      {
        visibility: 'private',
        beneficiaries: ['beneficiary-1'],
        groups: ['group-1'],
      },
    ],
  ];

  for (const [name, selection, expected] of cases) {
    test(name, () => {
      expect(buildMemoryAudiencePayload(selection)).toEqual(expected);
    });
  }

  test('specific requires at least one recipient', () => {
    expect(
      canApplyMemoryAudience({
        mode: 'specific',
        beneficiaryIds: [],
        groupIds: [],
      })
    ).toBe(false);
    expect(
      canApplyMemoryAudience({
        mode: 'specific',
        beneficiaryIds: ['b1'],
        groupIds: [],
      })
    ).toBe(true);
  });
});

describe('memory audience initialization', () => {
  test('missing legacy visibility defaults to private', () => {
    expect(deriveMemoryAudience({})).toEqual({
      mode: 'private',
      beneficiaryIds: [],
      groupIds: [],
    });
  });

  test('explicit everyone remains everyone when stale shares exist', () => {
    expect(
      deriveMemoryAudience({
        visibility: 'everyone',
        beneficiaries: [{ _id: 'stale-beneficiary' }],
        groups: ['stale-group'],
      })
    ).toEqual({ mode: 'everyone', beneficiaryIds: [], groupIds: [] });
  });

  test('private memory with populated recipients derives specific mode', () => {
    expect(
      deriveMemoryAudience({
        visibility: 'private',
        beneficiaries: [{ _id: 'b1' }, 'b2'],
        groups: [{ _id: 'g1' }],
      })
    ).toEqual({
      mode: 'specific',
      beneficiaryIds: ['b1', 'b2'],
      groupIds: ['g1'],
    });
  });

  test('invalid visibility remains private', () => {
    expect(deriveMemoryAudience({ visibility: 'public' })).toEqual({
      mode: 'private',
      beneficiaryIds: [],
      groupIds: [],
    });
  });

  test('labels every supported mode without consulting UI data', () => {
    expect(
      formatMemoryAudienceLabel({
        mode: 'private',
        beneficiaryIds: [],
        groupIds: [],
      })
    ).toBe('Private · Only me');
    expect(
      formatMemoryAudienceLabel({
        mode: 'everyone',
        beneficiaryIds: [],
        groupIds: [],
      })
    ).toBe('Everyone');
    expect(
      formatMemoryAudienceLabel({
        mode: 'specific',
        beneficiaryIds: ['b1'],
        groupIds: ['g1', 'g2'],
      })
    ).toBe('1 person, 2 groups');
  });
});
