/**
 * The app's AI consent gate: `ensureAiConsent()` before a chat message or a
 * voice call reaches the AI service. See `ai-consent.ts` for the rules.
 */
import { useAuthStore, useUiStore, useUserStore } from '@/store';
import { useAiConsentStore } from '@/store/ai-consent.store';
import { AI_CONSENT_SHEET, createAiConsentGate, hasAcceptedAiConsent } from './ai-consent';

const currentUserId = () => (useUserStore.getState().user ?? useAuthStore.getState().user)?._id ?? null;

function hydrated(): Promise<void> {
  const persistApi = useAiConsentStore.persist;
  if (!persistApi || persistApi.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = persistApi.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/** Synchronous check, for work that may only start once consent is given (call warm-up). */
export function hasAiConsentNow(): boolean {
  const persistApi = useAiConsentStore.persist;
  if (persistApi && !persistApi.hasHydrated()) return false;
  return hasAcceptedAiConsent(useAiConsentStore.getState().accepted, currentUserId());
}

export const ensureAiConsent = createAiConsentGate({
  ready: hydrated,
  getUserId: currentUserId,
  isAccepted: (userId) => hasAcceptedAiConsent(useAiConsentStore.getState().accepted, userId),
  accept: (userId) => {
    if (userId) useAiConsentStore.getState().accept(userId);
  },
  present: (handlers, onDismiss) => {
    const ui = useUiStore.getState();
    ui.openSheet(AI_CONSENT_SHEET, handlers);
    if (useUiStore.getState().activeSheet !== AI_CONSENT_SHEET) return false;
    const unsubscribe = useUiStore.subscribe((state) => {
      if (state.activeSheet === AI_CONSENT_SHEET) return;
      unsubscribe();
      onDismiss();
    });
    return true;
  },
});
