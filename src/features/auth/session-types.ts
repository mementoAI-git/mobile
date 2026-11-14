import type { Href } from 'expo-router';
import type { IAuth, IUser } from '@/types';

export type SessionPhase =
  | 'hydrating'
  | 'anonymous'
  | 'authenticating'
  | 'authenticated'
  | 'terminating';

export interface AuthenticatedSession {
  credentials: IAuth;
  user: IUser;
}

export interface SessionRouteSnapshot {
  phase: SessionPhase;
  group?: string;
  onboardingStatus: IUser['onboarding_status'] | null;
  pendingHref: Href | null;
  /** A skipped account chose to go back into onboarding. */
  resumingOnboarding?: boolean;
}

export type SessionRouteAction =
  | { type: 'none' }
  | {
      type: 'replace';
      href: Href;
      preserveCurrentHref?: boolean;
      consumePendingHref?: boolean;
    };
