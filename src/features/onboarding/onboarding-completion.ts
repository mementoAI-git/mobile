import type { OnboardingCompatibilityPayload } from './first-run-onboarding';
import type { IUser } from '@/types';

export type OnboardingCompletionStage =
  | 'profile'
  | 'persona'
  | 'onboarding'
  | 'completion'
  | 'completed-user'
  | 'skip'
  | 'profile-acknowledgement'
  | 'persona-acknowledgement'
  | 'onboarding-acknowledgement'
  | 'completion-acknowledgement'
  | 'skip-acknowledgement'
  | 'profile-refresh'
  | 'ownership'
  | 'auth-store'
  | 'compatibility-store'
  | 'draft';

export interface OnboardingProfileWrite {
  nickname: string;
}

export interface OnboardingPersonaWrite {
  self_description: string;
  join_reasons: string[];
}

export interface OnboardingAnswersWrite {
  motivation: string;
  current_priority: string[];
  priority_dimensions: string[];
  step: number;
}

export interface OnboardingCompletionWrite {
  self_description: string;
  join_reasons: string[];
  current_priority: string[];
  motivationType: string | null;
  stepReached: number;
}

export interface OnboardingSessionOwnership {
  accountId: string;
  sessionId: string;
}

export interface OnboardingCompletionDependencies {
  getOwnership(): OnboardingSessionOwnership | null;
  writeProfile(payload: OnboardingProfileWrite): Promise<void>;
  writePersona(payload: OnboardingPersonaWrite): Promise<void>;
  writeOnboarding(payload: OnboardingAnswersWrite): Promise<void>;
  completeOnboarding(
    payload: OnboardingCompletionWrite,
    ownership: OnboardingSessionOwnership,
  ): Promise<IUser | null>;
  setAuthUser(user: IUser): void;
  setCompatibilityUser(user: IUser): void;
  clearDraft(): Promise<void>;
}

export class OnboardingCompletionError extends Error {
  constructor(
    public readonly stage: OnboardingCompletionStage,
    public override readonly cause: unknown,
  ) {
    super(`First-run onboarding failed during ${stage}`, { cause });
    this.name = 'OnboardingCompletionError';
  }
}

async function atStage<T>(
  stage: OnboardingCompletionStage,
  operation: () => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    if (cause instanceof OnboardingCompletionError) throw cause;
    throw new OnboardingCompletionError(stage, cause);
  }
}

export function assertOnboardingOwnership(
  expected: OnboardingSessionOwnership,
  actual: OnboardingSessionOwnership | null,
): void {
  if (
    !actual ||
    actual.accountId !== expected.accountId ||
    actual.sessionId !== expected.sessionId
  ) {
    throw new OnboardingCompletionError(
      'ownership',
      new Error('The authenticated session changed during onboarding.'),
    );
  }
}

export function getOnboardingUserAccountId(user: IUser): string {
  return user._id?.trim() || user.email.trim().toLowerCase();
}

export async function completeFirstRunOnboarding(
  draft: OnboardingCompatibilityPayload,
  dependencies: OnboardingCompletionDependencies,
): Promise<IUser> {
  const ownership = dependencies.getOwnership();
  if (!ownership) {
    throw new OnboardingCompletionError(
      'ownership',
      new Error('An authenticated onboarding session is required.'),
    );
  }

  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  // The nickname (User record) saves alongside the persona answers to keep the
  // finishing screen short. Persona and onboarding stay in order: both upsert
  // the same persona record, which has a unique index.
  await Promise.all([
    atStage('profile', () => dependencies.writeProfile({ nickname: draft.nickname })),
    (async () => {
      await atStage('persona', () =>
        dependencies.writePersona({
          self_description: draft.self_description,
          join_reasons: [...draft.join_reasons],
        }),
      );
      assertOnboardingOwnership(ownership, dependencies.getOwnership());
      await atStage('onboarding', () =>
        dependencies.writeOnboarding({
          motivation: draft.motivationType ?? '',
          current_priority: [...draft.priorityDimensions],
          priority_dimensions: [...draft.priorityDimensions],
          step: draft.stepReached,
        }),
      );
    })(),
  ]);

  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  const completedUser = await atStage('completion', () =>
    dependencies.completeOnboarding(
      {
        self_description: draft.self_description,
        join_reasons: [...draft.join_reasons],
        current_priority: [...draft.priorityDimensions],
        motivationType: draft.motivationType,
        stepReached: draft.stepReached,
      },
      ownership,
    ),
  );

  if (
    !completedUser ||
    completedUser.onboarding_status !== 'completed' ||
    getOnboardingUserAccountId(completedUser) !== ownership.accountId
  ) {
    throw new OnboardingCompletionError(
      'completed-user',
      new Error('The server did not return a completed user.'),
    );
  }

  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  await atStage('auth-store', () => dependencies.setAuthUser(completedUser));
  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  await atStage('compatibility-store', () =>
    dependencies.setCompatibilityUser(completedUser),
  );
  assertOnboardingOwnership(ownership, dependencies.getOwnership());
  await atStage('draft', () => dependencies.clearDraft());

  return completedUser;
}
