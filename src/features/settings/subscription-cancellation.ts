export type CancellationReason = 'too_expensive' | 'not_using_enough' | 'features_not_needed' | 'privacy_concerns' | 'taking_a_break' | 'other';

export const CANCELLATION_REASONS: ReadonlyArray<{value: CancellationReason; label: string}> = [
  {value: 'too_expensive', label: 'It’s too expensive'},
  {value: 'not_using_enough', label: 'I’m not using Memento AI enough'},
  {value: 'features_not_needed', label: 'I don’t need the Pro features'},
  {value: 'privacy_concerns', label: 'I’m concerned about privacy'},
  {value: 'taking_a_break', label: 'I’m taking a break'},
  {value: 'other', label: 'Something else'},
];

export type BillingCancellationFeedback = {reason: CancellationReason; details?: string};

export function buildCancellationPayload(reason: CancellationReason | null, details: string): BillingCancellationFeedback | null {
  if (!reason) return null;
  const normalizedDetails = details.trim();
  if (reason === 'other' && !normalizedDetails) return null;
  return {reason, ...(normalizedDetails ? {details: normalizedDetails} : {})};
}
