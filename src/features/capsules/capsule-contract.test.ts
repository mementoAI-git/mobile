import { describe, expect, test } from 'bun:test';
import { resolveCapsuleRecipientInputs } from './capsule-contract';

describe('capsule recipient compatibility contract', () => {
  test('maps selected beneficiary IDs to the legacy email input while retaining direct emails', () => {
    expect(resolveCapsuleRecipientInputs(
      ['beneficiary-1', 'Guest@Example.com', 'missing'],
      [{ _id: 'beneficiary-1', email: 'Family@Example.com' }],
    )).toEqual(['family@example.com', 'guest@example.com', 'missing']);
  });

  test('deduplicates equivalent recipients', () => {
    expect(resolveCapsuleRecipientInputs(
      ['beneficiary-1', 'family@example.com'],
      [{ _id: 'beneficiary-1', email: 'family@example.com' }],
    )).toEqual(['family@example.com']);
  });
});
