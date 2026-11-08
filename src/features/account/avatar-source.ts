/** Same identity contract and DiceBear style as web utility/avatar-identity.ts:
 * account ID, then email, then legacy name. Web renders the SVG; React Native's
 * Image needs a raster, so mobile requests the PNG of the same Loops avatar.
 */
export function defaultAvatarUrl(email?: string | null, name?: string, userId?: string | null): string | null {
  const seed = [userId, email, name].map(value => value?.trim().toLowerCase()).find(Boolean);
  return seed ? `https://api.dicebear.com/10.x/loops/png?seed=${encodeURIComponent(seed)}` : null;
}

/** Web getAvatarSourceUrl: stored DiceBear placeholders (any style) become the
 * current generated avatar; genuine profile photos pass through unchanged.
 */
export function avatarSourceUrl(
  src: string | null | undefined,
  email?: string | null,
  name?: string,
  userId?: string | null,
): string | null {
  const trimmed = src?.trim();
  if (!trimmed) return null;
  const match = /^https?:\/\/api\.dicebear\.com\/[^?#]*(?:\?([^#]*))?/i.exec(trimmed);
  if (!match) return trimmed;
  const storedSeed = new URLSearchParams(match[1] ?? '').get('seed');
  return defaultAvatarUrl(email, name, userId) ?? defaultAvatarUrl(null, storedSeed ?? undefined);
}
