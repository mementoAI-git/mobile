import type { SubscriptionUsage } from './billing-adapters';

const FREE_LIMIT_BYTES = 200 * 1024 * 1024;
const PAID_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

export interface StoragePresentation {
  used: number;
  reserved: number;
  limit: number;
  remaining: number;
  percent: number;
  overLimit: boolean;
  warning: string | null;
}

export function getStoragePresentation(
  usage: SubscriptionUsage,
  isProOrAbove: boolean,
): StoragePresentation {
  const used = usage.storage_used_bytes ?? 0;
  const reserved = usage.storage_reserved_bytes ?? 0;
  const limit = usage.storage_limit_bytes || (isProOrAbove ? PAID_LIMIT_BYTES : FREE_LIMIT_BYTES);
  const remaining = usage.remaining_bytes ?? Math.max(0, limit - used - reserved);
  const occupiedPercent = limit > 0 ? ((used + reserved) / limit) * 100 : 0;
  const rawPercent = Math.max(usage.percent_used ?? 0, occupiedPercent);
  const percent = Math.min(100, Math.max(0, rawPercent));
  const overLimit = usage.over_limit ?? used > limit;
  const full = overLimit || remaining <= 0 || percent >= 100;
  const warning = full
    ? isProOrAbove
      ? 'Storage is full. Remove some files or contact support before uploading more.'
      : 'Storage is full. Remove some files or upgrade before uploading more.'
    : percent >= 80
      ? 'You’re running low on storage. Clear some space before your next upload.'
      : null;

  return { used, reserved, limit, remaining, percent, overLimit, warning };
}
