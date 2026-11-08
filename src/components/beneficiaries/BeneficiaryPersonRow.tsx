import React, { memo } from 'react';
import { PersonCard } from '@/components/beneficiaries/PersonCard';
import { personCardDetails } from '@/features/beneficiaries/people-cards';
import type { IBeneficiary } from '@/types';

/** A person on People & groups, as web beneficiary-card.tsx. */
export const BeneficiaryPersonRow = memo(function BeneficiaryPersonRow({
  beneficiary,
  onOptions,
}: {
  beneficiary: IBeneficiary;
  onOptions: () => void;
}) {
  return (
    <PersonCard
      name={beneficiary.name}
      email={beneficiary.email}
      user={beneficiary.user}
      details={personCardDetails(beneficiary)}
      onOptions={onOptions}
    />
  );
});
