import type { IAPProduct } from './iap-types';

/**
 * Whole-percent saving of the annual plan over twelve monthly payments, from
 * the store's own prices so the badge matches what the buyer is charged.
 * Rounded down, so the badge never promises more than the real saving.
 * Null when the prices are missing, in different currencies, or show no saving.
 */
export function annualSavingsPercent(
  monthly: Pick<IAPProduct, 'price' | 'currency'>,
  annual: Pick<IAPProduct, 'price' | 'currency'>,
): number | null {
  if (!(monthly.price > 0) || !(annual.price > 0)) return null;
  if (monthly.currency && annual.currency && monthly.currency !== annual.currency) return null;
  const yearOfMonthly = monthly.price * 12;
  const percent = Math.floor(((yearOfMonthly - annual.price) / yearOfMonthly) * 100);
  return percent > 0 ? percent : null;
}
