import {
  normalizeCollectionResponse,
  normalizeEntityResponse,
} from '@/api/domain-adapters';

export interface SubscriptionUsage {
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
  beneficiary_count?: number;
  timed_message_count?: number;
  time_capsule_count?: number;
  memory_integration_count?: number;
}

export interface SubscriptionSummary {
  tier: 'free' | 'pro' | 'legacy';
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused';
  usage?: SubscriptionUsage;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  provider?: 'polar';
  currency?: 'USD' | 'NGN';
  country?: string;
}

export interface BillingInvoice {
  id?: string;
  url?: string;
  label?: string;
  created_at?: string;
  amount?: number;
  currency?: 'USD' | 'NGN';
  status?: string;
}

export interface BillingUsage {
  storage_used_bytes: number;
  storage_limit_bytes: number;
  beneficiary_count: number;
  timed_message_count: number;
  time_capsule_count?: number;
  memory_integration_count?: number;
}

const USAGE_KEYS = [
  'storage_used_bytes',
  'storage_limit_bytes',
  'beneficiary_count',
  'timed_message_count',
  'time_capsule_count',
  'memory_integration_count',
] as const;

function parseUsage(raw: unknown): SubscriptionUsage | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const source = raw as Record<string, unknown>;
  const usage: SubscriptionUsage = {};
  for (const key of USAGE_KEYS) {
    if (typeof source[key] === 'number' && Number.isFinite(source[key])) {
      usage[key] = source[key];
    }
  }
  return Object.keys(usage).length > 0 ? usage : undefined;
}

export function normalizeSubscriptionSummary(payload: unknown): SubscriptionSummary {
  const raw = normalizeEntityResponse<Record<string, unknown>>(payload).data;
  if (!raw) return { tier: 'free', status: 'active' };
  const tier = raw.tier === 'pro' || raw.tier === 'legacy' ? raw.tier : 'free';
  const rawStatus = raw.status === 'canceled' ? 'cancelled' : raw.status;
  const status = rawStatus === 'trialing'
    || rawStatus === 'active'
    || rawStatus === 'past_due'
    || rawStatus === 'cancelled'
    || rawStatus === 'paused'
    ? rawStatus
    : 'active';

  return {
    tier,
    status,
    usage: parseUsage(raw.usage),
    trial_ends_at: typeof raw.trial_ends_at === 'string' ? raw.trial_ends_at : null,
    current_period_end: typeof raw.current_period_end === 'string' ? raw.current_period_end : null,
    cancel_at_period_end: typeof raw.cancel_at_period_end === 'boolean'
      ? raw.cancel_at_period_end
      : undefined,
    provider: raw.provider === 'polar' || raw.payment_provider === 'polar' ? 'polar' : undefined,
    currency: raw.currency === 'USD' || raw.currency === 'NGN' ? raw.currency : undefined,
    country: typeof raw.country === 'string' ? raw.country : undefined,
  };
}

export function normalizeBillingUsage(payload: unknown): BillingUsage | null {
  const raw = normalizeEntityResponse<Record<string, unknown>>(payload).data;
  const usage = parseUsage(raw);
  if (!usage) return null;
  return {
    storage_used_bytes: usage.storage_used_bytes ?? 0,
    storage_limit_bytes: usage.storage_limit_bytes ?? 0,
    beneficiary_count: usage.beneficiary_count ?? 0,
    timed_message_count: usage.timed_message_count ?? 0,
    time_capsule_count: usage.time_capsule_count,
    memory_integration_count: usage.memory_integration_count,
  };
}

export function normalizeBillingInvoices(payload: unknown): BillingInvoice[] {
  return normalizeCollectionResponse<BillingInvoice>(payload).data;
}

export function extractBillingUrl(
  payload: unknown,
  key: 'checkout_url' | 'portal_url',
): string | null {
  const raw = normalizeEntityResponse<Record<string, unknown>>(payload).data;
  return raw && typeof raw[key] === 'string' && raw[key] ? raw[key] : null;
}
