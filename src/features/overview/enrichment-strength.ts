/** Mirrors web chat-settings `enrichment-summary.tsx`: a word, not a number. */
export function enrichmentStrength(score: number | undefined) {
  if (score === undefined || !Number.isFinite(score)) return '–';
  if (score >= 70) return 'Strong';
  if (score >= 35) return 'Medium';
  // "Low" rather than web's "Weak": short enough for a half-width stat tile.
  return 'Low';
}
