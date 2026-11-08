import type { IBeneficiary, IGroup } from '@/types';
import { getGroupMemberCount } from './collections';

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE.format(date);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Web beneficiary-card.tsx: invites are pending until `accepted_at` is set. */
export function isInvitePending(beneficiary: Pick<IBeneficiary, 'accepted_at'>) {
  return !beneficiary.accepted_at;
}

/** Web person card details: relationship, then "Invite pending" or "Added MMM D, YYYY". */
export function personCardDetails(beneficiary: Pick<IBeneficiary, 'relationship' | 'accepted_at'>): string[] {
  const added = formatDate(beneficiary.accepted_at);
  const status = isInvitePending(beneficiary) ? 'Invite pending' : added ? `Added ${added}` : null;
  return [beneficiary.relationship, status]
    .filter((detail): detail is string => Boolean(detail && detail.trim()))
    .map(capitalize);
}

/** Web group card details: "Created MMM D, YYYY" and "N people". */
export function groupCardDetails(group: IGroup, memberCount = getGroupMemberCount(group)): string[] {
  const created = formatDate(group.created_at);
  return [created ? `Created ${created}` : null, `${memberCount} ${memberCount === 1 ? 'person' : 'people'}`]
    .filter((detail): detail is string => Boolean(detail));
}

/** People in a group: listed on the group itself or carrying the group in their own `groups`. */
export function isGroupMember(person: IBeneficiary, group: Pick<IGroup, '_id' | 'members'> | null | undefined, groupId: string) {
  const listed = (group?.members ?? []).some((member: any) => (typeof member === 'string' ? member : member?._id) === person._id);
  return listed || (Array.isArray(person.groups) && person.groups.some((g: any) => g === groupId || g?._id === groupId));
}

/** What to add and remove to turn `current` membership into `next`. */
export function membershipChanges(current: Set<string>, next: Set<string>) {
  return {
    add: [...next].filter((id) => !current.has(id)),
    remove: [...current].filter((id) => !next.has(id)),
  };
}
