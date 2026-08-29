import {
  normalizeAuthCompletion,
  type AuthCompletion,
} from '@/api/contract-adapter';
import type { IAuth, IUser } from '@/types';

type EstablishSession = (credentials: IAuth, user: IUser) => Promise<void>;

export async function completeAuthResponse(
  payload: unknown,
  establishSession: EstablishSession,
): Promise<AuthCompletion> {
  const completion = normalizeAuthCompletion(payload);
  if (completion.kind === 'session') {
    await establishSession(completion.credentials, completion.user);
  }
  return completion;
}
