/**
 * Where Sentry may attach `sentry-trace` and `baggage` headers. Only our own
 * API: third parties and pre-signed storage URLs don't need them.
 */
export function tracePropagationTargetsFor(apiBaseUrl: string): RegExp[] {
  let origin: string;
  try {
    origin = new URL(apiBaseUrl).origin;
  } catch {
    return [];
  }
  const escaped = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [new RegExp(`^${escaped}(/|$)`)];
}
