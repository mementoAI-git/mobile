/** Reasons offered when someone deletes their account (design: "Tell us why you're leaving"). */
export const DELETION_REASONS = [
  { value: 'unsatisfied', label: 'Unsatisfied with the product experience' },
  { value: 'not-using', label: 'I’m not using Memento AI enough' },
  { value: 'issues-unresolved', label: 'My issues with Memento were not resolved' },
  { value: 'safety-privacy', label: 'Safety or privacy concerns' },
  { value: 'taking-break', label: 'I’m taking a break' },
  { value: 'other', label: 'Something else' },
  { value: 'cant-say', label: 'Can’t say for now' },
] as const;

export type DeletionReason = (typeof DELETION_REASONS)[number]['value'];

export const DELETE_CONFIRMATION_WORD = 'DELETE';

export function deletionReasonLabel(reason: DeletionReason | null) {
  return DELETION_REASONS.find((item) => item.value === reason)?.label ?? 'No reason';
}

/** The final step unlocks only when the word is typed exactly (case-sensitive, trimmed). */
export function isDeletionConfirmed(text: string) {
  return text.trim() === DELETE_CONFIRMATION_WORD;
}

/** "groot***gmail.com"-style mask so the email can be shown without spelling it out. */
export function maskEmail(email?: string | null) {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, Math.min(5, Math.max(1, name.length - 1)))}***${domain}`;
}

export interface DeleteAccountPayload {
  reason?: DeletionReason;
  details?: string;
  export_data?: boolean;
}

export function buildDeleteAccountPayload(input: {
  reason: DeletionReason | null;
  details: string;
  exportData: boolean;
}): DeleteAccountPayload {
  const payload: DeleteAccountPayload = { export_data: input.exportData };
  if (input.reason) payload.reason = input.reason;
  const details = input.details.trim();
  if (input.reason === 'other' && details) payload.details = details.slice(0, 1000);
  return payload;
}

export interface StoreSubscriptionNotice {
  body: string;
  /** Which store's subscription settings "Manage subscription" opens. */
  store: 'apple' | 'google';
}

/**
 * Deleting the account doesn't cancel a store subscription, which keeps
 * billing until it is cancelled in the store. Web (Polar) billing ends with
 * the account, so it gets no notice. An unknown provider on iOS is treated as
 * App Store billing, since that is the only way to buy Pro there.
 */
export function getStoreSubscriptionNotice(
  provider: 'polar' | 'apple' | 'google' | undefined,
  platform: string,
): StoreSubscriptionNotice | null {
  const store = provider === 'apple' || provider === 'google'
    ? provider
    : !provider && platform === 'ios' ? 'apple' : null;
  if (!store) return null;
  const name = store === 'apple' ? 'Apple' : 'Google Play';
  return {
    store,
    body: `Your ${name} subscription keeps billing until you cancel it. Deleting your account doesn’t cancel it, so cancel it first in your ${name} subscriptions.`,
  };
}
