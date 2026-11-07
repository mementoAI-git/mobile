/** Same identity contract as web utility/avatar-identity.ts: account ID, email, legacy name. */
export function defaultAvatarUrl(email?: string | null, name?: string, userId?: string | null): string | null {
  const seed = [userId, email, name].map(value => value?.trim().toLowerCase()).find(Boolean);
  return seed ? `https://api.dicebear.com/10.x/critters/png?seed=${encodeURIComponent(seed)}` : null;
}
