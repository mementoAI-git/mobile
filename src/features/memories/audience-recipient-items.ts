export interface AudienceRecipientItem {
  id: string;
  name: string;
  secondaryText?: string;
  kind: 'beneficiary' | 'group';
  initial: string;
}

type BeneficiaryLike = { _id?: string; name?: string; email?: string };
type GroupLike = { _id?: string; name?: string };

export function buildAudienceRecipientItems(
  beneficiaries: BeneficiaryLike[],
  groups: GroupLike[],
  search: string
): AudienceRecipientItem[] {
  const people = beneficiaries.flatMap((person): AudienceRecipientItem[] => {
    const id = person._id?.trim();
    const name = (person.name || person.email || '').trim();
    if (!id || !name) return [];
    return [{ id, name, secondaryText: person.email?.trim() || undefined, kind: 'beneficiary', initial: name.charAt(0).toUpperCase() }];
  });
  const groupItems = groups.flatMap((group): AudienceRecipientItem[] => {
    const id = group._id?.trim();
    const name = group.name?.trim();
    if (!id || !name) return [];
    return [{ id, name, kind: 'group', initial: name.charAt(0).toUpperCase() }];
  });
  const query = search.trim().toLowerCase();
  return [...people, ...groupItems].filter(item => !query || `${item.name} ${item.secondaryText ?? ''}`.toLowerCase().includes(query));
}
