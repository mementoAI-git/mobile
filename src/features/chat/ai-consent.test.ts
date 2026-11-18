import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  AI_CONSENT_VERSION,
  createAiConsentGate,
  hasAcceptedAiConsent,
  type AiConsentMap,
  type AiConsentPromptHandlers,
} from './ai-consent';

function harness(options: { userId?: string | null; shown?: boolean } = {}) {
  const accepted: AiConsentMap = {};
  const prompts: { handlers: AiConsentPromptHandlers; dismiss: () => void }[] = [];
  const userId = 'userId' in options ? options.userId : 'user-1';
  const gate = createAiConsentGate({
    ready: async () => {},
    getUserId: () => userId,
    isAccepted: (id) => hasAcceptedAiConsent(accepted, id),
    accept: (id) => {
      if (id) accepted[id] = { version: AI_CONSENT_VERSION, acceptedAt: 'now' };
    },
    present: (handlers, dismiss) => {
      if (options.shown === false) return false;
      prompts.push({ handlers, dismiss });
      return true;
    },
  });
  return { gate, accepted, prompts };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('hasAcceptedAiConsent', () => {
  test('is per account and per disclosure version', () => {
    const accepted: AiConsentMap = { a: { version: AI_CONSENT_VERSION, acceptedAt: 'x' } };
    expect(hasAcceptedAiConsent(accepted, 'a')).toBe(true);
    expect(hasAcceptedAiConsent(accepted, 'b')).toBe(false);
    expect(hasAcceptedAiConsent(accepted, null)).toBe(false);
    expect(hasAcceptedAiConsent({ a: { version: AI_CONSENT_VERSION - 1, acceptedAt: 'x' } }, 'a')).toBe(false);
  });
});

describe('AI consent gate', () => {
  test('asks once, sends after Agree, and remembers the account', async () => {
    const { gate, accepted, prompts } = harness();
    const answer = gate();
    await flush();
    expect(prompts).toHaveLength(1);
    prompts[0].handlers.onAgree();
    expect(await answer).toBe(true);
    expect(accepted['user-1']?.version).toBe(AI_CONSENT_VERSION);

    expect(await gate()).toBe(true);
    expect(prompts).toHaveLength(1);
  });

  test('Not now does not send and asks again next time', async () => {
    const { gate, accepted, prompts } = harness();
    const answer = gate();
    await flush();
    prompts[0].handlers.onDecline();
    expect(await answer).toBe(false);
    expect(accepted['user-1']).toBeUndefined();

    const again = gate();
    await flush();
    expect(prompts).toHaveLength(2);
    prompts[1].dismiss();
    expect(await again).toBe(false);
  });

  test('dismissing the sheet counts as not now', async () => {
    const { gate, prompts } = harness();
    const answer = gate();
    await flush();
    prompts[0].dismiss();
    expect(await answer).toBe(false);
  });

  test('calls while the sheet is open share one prompt', async () => {
    const { gate, prompts } = harness();
    const first = gate();
    const second = gate();
    await flush();
    expect(prompts).toHaveLength(1);
    prompts[0].handlers.onAgree();
    // A late dismiss after the choice changes nothing.
    prompts[0].dismiss();
    expect(await Promise.all([first, second])).toEqual([true, true]);
  });

  test('never sends when the sheet cannot be shown', async () => {
    const { gate } = harness({ shown: false });
    expect(await gate()).toBe(false);
  });

  test('without an account id, Agree allows only this request', async () => {
    const { gate, accepted, prompts } = harness({ userId: null });
    const answer = gate();
    await flush();
    prompts[0].handlers.onAgree();
    expect(await answer).toBe(true);
    expect(Object.keys(accepted)).toHaveLength(0);
  });
});

describe('AI consent wiring', () => {
  const read = (path: string) => readFileSync(path, 'utf8');

  test('chat sends and voice calls wait for consent', () => {
    expect(read('src/hooks/use-chat-logic.ts')).toContain('await ensureAiConsent()');
    expect(read('src/screens/ChatScreen.tsx')).toContain('ensureAiConsent()');
    const voice = read('src/hooks/use-voice-mode.ts');
    expect(voice).toContain('await ensureAiConsent()');
    expect(voice).toMatch(/const connect = useCallback\(async \(\) => \{[\s\S]*?if \(!hasAiConsentNow\(\)\) \{\s*void connectAfterConsent\(\);/);
    // No Gemini session is prepared before the member agrees.
    expect(voice).toMatch(/const prefetch = useCallback\([\s\S]*?if \(!hasAiConsentNow\(\)\) return;/);
  });

  test('the sheet is registered and says what is sent and to whom', () => {
    expect(read('src/store/ui.store.ts')).toContain("| 'ai-data-consent'");
    expect(read('src/components/sheets/SheetManager.tsx')).toContain("'ai-data-consent'");
    const sheet = read('src/components/sheets/AiDataConsentSheet.tsx');
    expect(sheet).toContain('Before you talk with Memento');
    expect(sheet).toContain('Gemini');
    expect(sheet).toContain('Agree and continue');
    expect(sheet).toContain('Not now');
    expect(sheet).toContain('PRIVACY_URL');
  });
});
