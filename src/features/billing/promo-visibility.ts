/**
 * Promo codes unlock Pro outside Apple's in-app purchase, which App Review
 * rejects (guideline 3.1.1), so iOS never shows the promo code card.
 */
export function canRedeemPromoCode(platform: string): boolean {
  return platform !== 'ios';
}
