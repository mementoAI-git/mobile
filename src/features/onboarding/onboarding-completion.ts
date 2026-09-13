import type { OnboardingCompatibilityPayload } from './first-run-onboarding';
import type { IUser } from '@/types';

export type OnboardingCompletionStage =
  | 'profile'
  | 'persona'
  | 'onboarding'
  | 'completion'
  | 'completed-user'
  | 'skip'
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

export interface OnboardingCompletionDependencies {
  writeProfile(payload: OnboardingProfileWrite): Promise<void>;
  writePersona(payload: OnboardingPersonaWrite): Promise<void>;
  writeOnboarding(payload: OnboardingAnswersWrite): Promise<void>;
  completeOnboarding(payload: OnboardingCompletionWrite): Promise<IUser | null>;
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
    throw new OnboardingCompletionError(stage, cause);
  }
}

export async function completeFirstRunOnboarding(
  draft: OnboardingCompatibilityPayload,
  dependencies: OnboardingCompletionDependencies,
): Promise<IUser> {
  await atStage('profile', () =>
    dependencies.writeProfile({ nickname: draft.nickname }),
  );
  await atStage('persona', () =>
    dependencies.writePersona({
      self_description: draft.self_description,
      join_reasons: [...draft.join_reasons],
    }),
  );
  await atStage('onboarding', () =>
    dependencies.writeOnboarding({
      motivation: draft.motivationType ?? '',
      current_priority: [...draft.priorityDimensions],
      priority_dimensions: [...draft.priorityDimensions],
      step: draft.stepReached,
    }),
  );

  const completedUser = await atStage('completion', () =>
    dependencies.completeOnboarding({
      self_description: draft.self_description,
      join_reasons: [...draft.join_reasons],
      current_priority: [...draft.priorityDimensions],
      motivationType: draft.motivationType,
      stepReached: draft.stepReached,
    }),
  );

  if (!completedUser || completedUser.onboarding_status !== 'completed') {
    throw new OnboardingCompletionError(
      'completed-user',
      new Error('The server did not return a completed user.'),
    );
  }

  await atStage('auth-store', () => dependencies.setAuthUser(completedUser));
  await atStage('compatibility-store', () =>
    dependencies.setCompatibilityUser(completedUser),
  );
  await atStage('draft', () => dependencies.clearDraft());

  return completedUser;
}
