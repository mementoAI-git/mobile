import endpoint from '@/api/endpoint';
import type { ApiResponse } from '@/api/interface';
import type { OnboardingCompatibilityPayload } from './first-run-onboarding';
import {
  assertOnboardingOwnership,
  completeFirstRunOnboarding,
  getOnboardingUserAccountId,
  OnboardingCompletionError,
  type OnboardingCompletionStage,
  type OnboardingSessionOwnership,
} from './onboarding-completion';
import type { IAuth, IUser } from '@/types';
import type { OnboardingSkipAnswers } from './onboarding-resume';

type Request = (url: string, payload: unknown) => Promise<ApiResponse<unknown>>;

export interface FirstRunOnboardingMutationDependencies {
  getOwnership(): OnboardingSessionOwnership | null;
  putRequest: Request;
  postRequest: Request;
  getProfile(): Promise<ApiResponse<IUser>>;
  setAuthUser(user: IUser): void;
  setCompatibilityUser(user: IUser): void;
  clearDraft(): Promise<void>;
}

interface AuthOwnershipSnapshot {
  phase: string;
  token: IAuth | null;
  user: IUser | null;
}

function readJwtSessionId(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload || typeof globalThis.atob !== 'function') return null;

  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      Math.ceil(payload.length / 4) * 4,
      '=',
    );
    const claims = JSON.parse(globalThis.atob(padded)) as { sid?: unknown };
    return typeof claims.sid === 'string' && claims.sid ? claims.sid : null;
  } catch {
    return null;
  }
}

export function getOnboardingSessionOwnership(
  snapshot: AuthOwnershipSnapshot,
): OnboardingSessionOwnership | null {
  if (snapshot.phase !== 'authenticated' || !snapshot.token || !snapshot.user) {
    return null;
  }

  const accountId = getOnboardingUserAccountId(snapshot.user);
  const sessionId =
    readJwtSessionId(snapshot.token.access_token) ??
    readJwtSessionId(snapshot.token.refresh_token) ??
    snapshot.token.refresh_token;
  return accountId && sessionId ? { accountId, sessionId } : null;
}

function requireAcknowledgement(
  response: ApiResponse<unknown>,
  stage: OnboardingCompletionStage,
): void {
  const statusAccepted =
    response.status === undefined ||
    (response.status >= 200 && response.status < 300);
  if (response.success !== true || !statusAccepted) {
    throw new OnboardingCompletionError(
      stage,
      new Error('The server did not acknowledge the onboarding request.'),
    );
  }
}

async function refreshProfile(
  dependencies: FirstRunOnboardingMutationDependencies,
  ownership: OnboardingSessionOwnership,
): Promise<IUser | null> {
  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  try {
    const response = await dependencies.getProfile();
    requireAcknowledgement(response, 'profile-refresh');
    return response.data ?? null;
  } catch (cause) {
    if (cause instanceof OnboardingCompletionError) throw cause;
    throw new OnboardingCompletionError('profile-refresh', cause);
  }
}

export function executeFirstRunOnboardingMutation(
  draft: OnboardingCompatibilityPayload,
  dependencies: FirstRunOnboardingMutationDependencies,
): Promise<IUser> {
  return completeFirstRunOnboarding(draft, {
    getOwnership: dependencies.getOwnership,
    writeProfile: async (payload) => {
      const response = await dependencies.putRequest(endpoint.profile, payload);
      requireAcknowledgement(response, 'profile-acknowledgement');
    },
    writePersona: async (payload) => {
      const response = await dependencies.putRequest(endpoint.persona, payload);
      requireAcknowledgement(response, 'persona-acknowledgement');
    },
    writeOnboarding: async (payload) => {
      const response = await dependencies.postRequest(endpoint.onboarding, payload);
      requireAcknowledgement(response, 'onboarding-acknowledgement');
    },
    completeOnboarding: async (payload, ownership) => {
      const response = await dependencies.postRequest(
        endpoint.completeOnboarding,
        payload,
      );
      requireAcknowledgement(response, 'completion-acknowledgement');
      return refreshProfile(dependencies, ownership);
    },
    setAuthUser: dependencies.setAuthUser,
    setCompatibilityUser: dependencies.setCompatibilityUser,
    clearDraft: dependencies.clearDraft,
  });
}

function requireOwnership(
  dependencies: FirstRunOnboardingMutationDependencies,
): OnboardingSessionOwnership {
  const ownership = dependencies.getOwnership();
  if (!ownership) {
    throw new OnboardingCompletionError(
      'ownership',
      new Error('An authenticated onboarding session is required.'),
    );
  }
  return ownership;
}

export async function executeSkipFirstRunOnboardingMutation(
  dependencies: FirstRunOnboardingMutationDependencies,
  answers: OnboardingSkipAnswers = {},
  nickname?: string,
): Promise<IUser> {
  const ownership = requireOwnership(dependencies);
  assertOnboardingOwnership(ownership, dependencies.getOwnership());

  // Keep a name typed before Skip; best effort, it must not block skipping.
  if (nickname?.trim()) {
    await dependencies.putRequest(endpoint.profile, { nickname: nickname.trim() }).catch(() => undefined);
    assertOnboardingOwnership(ownership, dependencies.getOwnership());
  }
  // The API keeps these so a return to onboarding starts filled in.
  const response = await dependencies.postRequest(endpoint.onboardingSkip, answers);
  requireAcknowledgement(response, 'skip-acknowledgement');

  const user = await refreshProfile(dependencies, ownership);
  if (
    !user ||
    (user.onboarding_status !== 'skipped' && user.onboarding_status !== 'completed') ||
    getOnboardingUserAccountId(user) !== ownership.accountId
  ) {
    throw new OnboardingCompletionError(
      'completed-user',
      new Error('The server did not return the initiating user in a terminal state.'),
    );
  }

  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  dependencies.setAuthUser(user);
  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  dependencies.setCompatibilityUser(user);
  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  await dependencies.clearDraft();
  return user;
}
