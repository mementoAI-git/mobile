export type SetPasswordPayload = { token: string; password: string; email?: string };

/**
 * The body for POST /auth/set-password. A 6-digit reset code only counts
 * together with the address it was sent to, so the email from the
 * verification step goes along with it.
 */
export function buildSetPasswordPayload(
  token: string,
  password: string,
  email?: string | null,
): SetPasswordPayload {
  const address = email?.trim().toLowerCase();
  return address ? { token, password, email: address } : { token, password };
}
