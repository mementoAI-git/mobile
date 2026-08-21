// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('session route policy', () => {
  test('holds unstable phases and chooses one destination for stable phases', async () => {
    let policy: typeof import('./session-route-policy') | undefined;
    try {
      policy = await import('./session-route-policy');
    } catch {
      // Expected on the first red run.
    }

    expect(policy?.getSessionRouteAction).toBeFunction();
    const getAction = policy!.getSessionRouteAction;

    expect(getAction({ phase: 'hydrating', group: '(auth)', onboardingStatus: null, pendingHref: null })).toEqual({ type: 'none' });
    expect(getAction({ phase: 'terminating', group: '(tabs)', onboardingStatus: 'completed', pendingHref: null })).toEqual({ type: 'none' });
    expect(getAction({ phase: 'anonymous', group: '(tabs)', onboardingStatus: null, pendingHref: null })).toEqual({ type: 'replace', href: '/(auth)/login', preserveCurrentHref: true });
    expect(getAction({ phase: 'anonymous', group: '(auth)', onboardingStatus: null, pendingHref: null })).toEqual({ type: 'none' });
    expect(getAction({ phase: 'authenticated', group: '(auth)', onboardingStatus: 'never', pendingHref: null })).toEqual({ type: 'replace', href: '/(onboard)', consumePendingHref: false });
    expect(getAction({ phase: 'authenticated', group: '(auth)', onboardingStatus: 'completed', pendingHref: '/chat/thread-1' })).toEqual({ type: 'replace', href: '/chat/thread-1', consumePendingHref: true });
    expect(getAction({ phase: 'authenticated', group: '(tabs)', onboardingStatus: 'completed', pendingHref: null })).toEqual({ type: 'none' });
  });

  test('uses a stable key for equivalent reconciliation snapshots', async () => {
    const { getSessionReconciliationKey } = await import('./session-route-policy');
    const snapshot = {
      phase: 'authenticated' as const,
      group: '(auth)',
      onboardingStatus: 'completed' as const,
      pendingHref: '/(tabs)/overview' as const,
    };

    expect(getSessionReconciliationKey(snapshot)).toBe(
      getSessionReconciliationKey({ ...snapshot }),
    );
  });
});
