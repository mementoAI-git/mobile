/** Mirrors web chat-settings `enrichment-summary.tsx`: a word, not a number. */
export function enrichmentStrength(score: number | undefined) {
  if (score === undefined || !Number.isFinite(score)) return '–';
  if (score >= 70) return 'Strong';
  if (score >= 35) return 'Medium';
  // The product name for the lowest band (was "Low"; web's insights tile says "Getting started" too).
  return 'Getting started';
}
