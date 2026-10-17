/** Keep the version, format and seed normalization identical to web UserAvatar. */
export function defaultAvatarUrl(seed?: string | null, name?: string): string | null {
  const normalizedSeed = (seed || name || '').trim().toLowerCase();
  return normalizedSeed
    ? `https://api.dicebear.com/10.x/critters/png?seed=${encodeURIComponent(normalizedSeed)}`
    : null;
}
