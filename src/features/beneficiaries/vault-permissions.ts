import type { IBeneficiary } from '@/types';

export type VaultAccessScope = 'full_vault' | 'specific_capsules' | 'selected_categories';

export interface VaultAccessOption {
  value: VaultAccessScope;
  title: string;
  description: string;
}

export const VAULT_ACCESS_OPTIONS: VaultAccessOption[] = [
  {
    value: 'full_vault',
    title: 'Full legacy vault',
    description: 'Access to all stories, time capsules, and preserved media.',
  },
  {
    value: 'specific_capsules',
    title: 'Specific time capsules',
    description: 'Only capsules where this contact is explicitly named.',
  },
  {
    value: 'selected_categories',
    title: 'Selected chapters',
    description: 'Only memories from chosen categories like Family or Heritage.',
  },
];

export interface BeneficiaryStatusBadge {
  label: string;
  variant: 'pending' | 'verified' | 'active';
  textColor: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Returns clean visual badge metadata for a beneficiary's status.
 */
export function getBeneficiaryStatusBadge(
  beneficiary: Partial<IBeneficiary> | null | undefined
): BeneficiaryStatusBadge {
  const rawStatus = (beneficiary?.status || '').toLowerCase();
  const isAccepted = Boolean(beneficiary?.accepted_at);

  if (isAccepted || rawStatus === 'active' || rawStatus === 'accepted') {
    return {
      label: 'Active',
      variant: 'active',
      textColor: '#067A57',
      bgColor: 'rgba(6, 122, 87, 0.08)',
      borderColor: 'rgba(6, 122, 87, 0.2)',
    };
  }

  if (rawStatus === 'verified') {
    return {
      label: 'Verified',
      variant: 'verified',
      textColor: '#1A80F7',
      bgColor: 'rgba(26, 128, 247, 0.08)',
      borderColor: 'rgba(26, 128, 247, 0.2)',
    };
  }

  return {
    label: 'Invite pending',
    variant: 'pending',
    textColor: '#8F6C1A',
    bgColor: 'rgba(143, 108, 26, 0.08)',
    borderColor: 'rgba(143, 108, 26, 0.2)',
  };
}

/**
 * Formats access scope label for cards and lists.
 */
export function getVaultAccessScopeLabel(
  scope?: VaultAccessScope | string,
  capsuleCount?: number
): string {
  if (scope === 'specific_capsules') {
    return capsuleCount ? `${capsuleCount} capsules` : 'Assigned capsules';
  }
  if (scope === 'selected_categories') {
    return 'Selected chapters';
  }
  return 'Full vault';
}

export type BeneficiaryFilterTab = 'all' | 'active' | 'pending';

/**
 * Filters beneficiary lists by status tab.
 */
export function filterBeneficiaries(
  beneficiaries: IBeneficiary[],
  tab: BeneficiaryFilterTab
): IBeneficiary[] {
  if (!beneficiaries) return [];
  if (tab === 'all') return beneficiaries;

  return beneficiaries.filter((b) => {
    const badge = getBeneficiaryStatusBadge(b);
    if (tab === 'active') return badge.variant === 'active' || badge.variant === 'verified';
    if (tab === 'pending') return badge.variant === 'pending';
    return true;
  });
}
