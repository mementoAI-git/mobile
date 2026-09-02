/**
 * Pinned subset of the canonical API contract used by the mobile migration.
 * Full artifact checksum: 8b112db013ea4328bd72c9020e063f62d5ad04378969cf29855c1d4c01403536
 */
export const MEMENTO_API_CONTRACT_SHA256 =
  '8b112db013ea4328bd72c9020e063f62d5ad04378969cf29855c1d4c01403536';

export interface GeneratedSessionPayload {
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
  onboarding_status: string;
  user: Record<string, unknown>;
}

export interface GeneratedAttachmentAccess {
  expires_at: string;
  refresh_endpoint: string;
}
