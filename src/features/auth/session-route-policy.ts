import type {
  SessionRouteAction,
  SessionRouteSnapshot,
} from '@/features/auth/session-types';

const UNSTABLE_PHASES = new Set(['hydrating', 'authenticating', 'terminating']);

export function getSessionRouteAction(
  snapshot: SessionRouteSnapshot,
): SessionRouteAction {
  if (UNSTABLE_PHASES.has(snapshot.phase)) return { type: 'none' };

  const inAuth = snapshot.group === '(auth)';
  const inOnboard = snapshot.group === '(onboard)';

  if (snapshot.phase === 'anonymous') {
    return inAuth
      ? { type: 'none' }
      : {
          type: 'replace',
          href: '/(auth)/login',
          preserveCurrentHref: true,
        };
  }

  if (!snapshot.onboardingStatus) return { type: 'none' };

  if (snapshot.onboardingStatus === 'never') {
    return inOnboard
      ? { type: 'none' }
      : {
          type: 'replace',
          href: '/(onboard)',
          consumePendingHref: false,
        };
  }

  // Someone who skipped can return to finish onboarding from Settings,
  // Insights or the overview banner.
  if (inOnboard && snapshot.onboardingStatus === 'skipped' && snapshot.resumingOnboarding) {
    return { type: 'none' };
  }

  if (inAuth || inOnboard) {
    return {
      type: 'replace',
      href: snapshot.pendingHref ?? '/(tabs)/overview',
      consumePendingHref: Boolean(snapshot.pendingHref),
    };
  }

  return { type: 'none' };
}

export function getSessionReconciliationKey(snapshot: SessionRouteSnapshot) {
  return [
    snapshot.phase,
    snapshot.group ?? '',
    snapshot.onboardingStatus ?? '',
    snapshot.pendingHref ? String(snapshot.pendingHref) : '',
    snapshot.resumingOnboarding ? 'resuming' : '',
  ].join('|');
}
