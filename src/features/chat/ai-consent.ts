/**
 * One-time consent before anything is sent to the AI service (App Review
 * guideline 5.1.2(i)): the first chat message or voice call asks first, and
 * nothing is sent until the member agrees. Acceptance is kept per account.
 *
 * Pure logic only; `ai-consent-gate.ts` wires it to the stores and sheets.
 */

export const AI_CONSENT_SHEET = 'ai-data-consent' as const;
/** Bump when the disclosure changes materially, so everyone is asked again. */
export const AI_CONSENT_VERSION = 1;

export interface AiConsentRecord {
  version: number;
  acceptedAt: string;
}

export type AiConsentMap = Record<string, AiConsentRecord | undefined>;

export function hasAcceptedAiConsent(accepted: AiConsentMap, userId: string | null | undefined): boolean {
  if (!userId) return false;
  const record = accepted[userId];
  return Boolean(record && record.version >= AI_CONSENT_VERSION);
}

export interface AiConsentPromptHandlers {
  onAgree: () => void;
  onDecline: () => void;
}

export interface AiConsentGateDeps {
  /** Resolves once the persisted acceptances are loaded. */
  ready: () => Promise<void>;
  getUserId: () => string | null | undefined;
  isAccepted: (userId: string | null | undefined) => boolean;
  /** Persists acceptance; a missing account id accepts for this request only. */
  accept: (userId: string | null | undefined) => void;
  /**
   * Shows the consent sheet. Returns false when it could not be shown, and
   * calls `onDismiss` if the sheet closes without a choice (swipe, backdrop,
   * or another sheet replacing it).
   */
  present: (handlers: AiConsentPromptHandlers, onDismiss: () => void) => boolean;
}

/**
 * Returns `ensureAiConsent()`: resolves true when the member has agreed (now
 * or before) and false when they decline or the prompt can't be shown. Calls
 * made while the prompt is open share its answer.
 */
export function createAiConsentGate(deps: AiConsentGateDeps): () => Promise<boolean> {
  let pending: Promise<boolean> | null = null;

  return async function ensureAiConsent() {
    await deps.ready();
    if (deps.isAccepted(deps.getUserId())) return true;
    if (pending) return pending;

    pending = new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (agreed: boolean) => {
        if (settled) return;
        settled = true;
        pending = null;
        resolve(agreed);
      };
      const shown = deps.present(
        {
          onAgree: () => {
            deps.accept(deps.getUserId());
            settle(true);
          },
          onDecline: () => settle(false),
        },
        () => settle(false),
      );
      if (!shown) settle(false);
    });
    return pending;
  };
}
