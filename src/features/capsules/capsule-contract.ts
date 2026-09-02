interface RecipientLookup {
  _id?: string;
  email?: string;
}

export function resolveCapsuleRecipientInputs(
  selected: string[],
  beneficiaries: RecipientLookup[],
): string[] {
  const emailsById = new Map(
    beneficiaries
      .filter((beneficiary) => beneficiary._id && beneficiary.email)
      .map((beneficiary) => [beneficiary._id!, beneficiary.email!] as const),
  );
  return [...new Set(selected.map((value) => (
    emailsById.get(value) ?? value
  ).trim().toLowerCase()).filter(Boolean))];
}
