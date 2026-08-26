// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
  getBeneficiaryStatusBadge,
  getVaultAccessScopeLabel,
  filterBeneficiaries,
  VAULT_ACCESS_OPTIONS,
} from './vault-permissions';

describe('vault permissions and beneficiary status', () => {
  test('formats pending status by default or when accepted_at is missing', () => {
    const badge = getBeneficiaryStatusBadge({ name: 'Jane', status: 'pending' });
    expect(badge.label).toBe('Invite pending');
    expect(badge.variant).toBe('pending');
  });

  test('formats active status when accepted_at is present or status is active', () => {
    const badge = getBeneficiaryStatusBadge({
      name: 'John',
      status: 'active',
      accepted_at: '2026-08-25T10:00:00Z',
    });
    expect(badge.label).toBe('Active');
    expect(badge.variant).toBe('active');
  });

  test('formats verified status properly', () => {
    const badge = getBeneficiaryStatusBadge({ name: 'Alice', status: 'verified' });
    expect(badge.label).toBe('Verified');
    expect(badge.variant).toBe('verified');
  });

  test('formats access scope labels correctly', () => {
    expect(getVaultAccessScopeLabel('full_vault')).toBe('Full vault');
    expect(getVaultAccessScopeLabel('specific_capsules', 3)).toBe('3 capsules');
    expect(getVaultAccessScopeLabel('specific_capsules')).toBe('Assigned capsules');
    expect(getVaultAccessScopeLabel('selected_categories')).toBe('Selected chapters');
  });

  test('filters beneficiaries by active and pending status tabs', () => {
    const list = [
      { name: 'Active Person', status: 'active', accepted_at: '2026-01-01' },
      { name: 'Pending Person', status: 'pending' },
      { name: 'Verified Person', status: 'verified' },
    ];

    const all = filterBeneficiaries(list as any, 'all');
    expect(all.length).toBe(3);

    const activeOnly = filterBeneficiaries(list as any, 'active');
    expect(activeOnly.length).toBe(2);
    expect(activeOnly.map((b) => b.name)).toEqual(['Active Person', 'Verified Person']);

    const pendingOnly = filterBeneficiaries(list as any, 'pending');
    expect(pendingOnly.length).toBe(1);
    expect(pendingOnly[0].name).toBe('Pending Person');
  });
});
