import {
  normalizeCollectionResponse,
  normalizeEntityResponse,
} from '@/api/domain-adapters';

export interface SubscriptionUsage {
  storage_used_bytes?: number;
  storage_reserved_bytes?: number;
  storage_limit_bytes?: number;
  remaining_bytes?: number;
  percent_used?: number;
  over_limit?: boolean;
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
  provider?: 'polar' | 'apple' | 'google';
  currency?: 'USD' | 'NGN';
  country?: string;
  store_account_token?: string;
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
  storage_reserved_bytes?: number;
  remaining_bytes?: number;
  percent_used?: number;
  over_limit?: boolean;
  beneficiary_count: number;
  timed_message_count: number;
  time_capsule_count?: number;
  memory_integration_count?: number;
}

export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface BillingPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
}

export interface BillingProfile {
  email: string | null;
  name: string | null;
  address: BillingAddress | null;
  paymentMethods: BillingPaymentMethod[];
  management: 'polar_portal';
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function normalizeBillingProfile(payload: unknown): BillingProfile | null {
  const raw = normalizeEntityResponse<Record<string, unknown>>(payload).data;
  if (!raw) return null;
  const sourceAddress = raw.address && typeof raw.address === 'object' && !Array.isArray(raw.address)
    ? raw.address as Record<string, unknown>
    : null;
  const address = sourceAddress ? {
    line1: optionalString(sourceAddress.line1),
    line2: optionalString(sourceAddress.line2),
    city: optionalString(sourceAddress.city),
    state: optionalString(sourceAddress.state),
    postalCode: optionalString(sourceAddress.postal_code),
    country: optionalString(sourceAddress.country),
  } : null;
  const paymentMethods = Array.isArray(raw.payment_methods)
    ? raw.payment_methods.flatMap(method => {
      if (!method || typeof method !== 'object' || Array.isArray(method)) return [];
      const item = method as Record<string, unknown>;
      const id = optionalString(item.id);
      const brand = optionalString(item.brand);
      const last4 = optionalString(item.last4);
      if (!id || !brand || !last4 || !/^\d{4}$/.test(last4)) return [];
      return [{id, brand: brand.toLowerCase(), last4, isDefault: item.is_default === true}];
    })
    : [];
  return {
    email: optionalString(raw.email) ?? null,
    name: optionalString(raw.name) ?? null,
    address: address && Object.values(address).some(Boolean) ? address : null,
    paymentMethods,
    management: 'polar_portal',
  };
}

const USAGE_KEYS = [
  'storage_used_bytes',
  'storage_reserved_bytes',
  'storage_limit_bytes',
  'remaining_bytes',
  'percent_used',
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
  if (typeof source.over_limit === 'boolean') usage.over_limit = source.over_limit;
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
    provider: (
      raw.provider === 'apple' || raw.payment_provider === 'apple' || raw.provider === 'storekit' ? 'apple' :
      raw.provider === 'google' || raw.payment_provider === 'google' || raw.provider === 'play_billing' ? 'google' :
      raw.provider === 'polar' || raw.payment_provider === 'polar' ? 'polar' : undefined
    ),
    currency: raw.currency === 'USD' || raw.currency === 'NGN' ? raw.currency : undefined,
    country: typeof raw.country === 'string' ? raw.country : undefined,
    store_account_token: typeof raw.store_account_token === 'string'
      ? raw.store_account_token
      : undefined,
  };
}

export function normalizeBillingUsage(payload: unknown): BillingUsage | null {
  const raw = normalizeEntityResponse<Record<string, unknown>>(payload).data;
  const usage = parseUsage(raw);
  if (!usage) return null;
  return {
    storage_used_bytes: usage.storage_used_bytes ?? 0,
    storage_limit_bytes: usage.storage_limit_bytes ?? 0,
    storage_reserved_bytes: usage.storage_reserved_bytes,
    remaining_bytes: usage.remaining_bytes,
    percent_used: usage.percent_used,
    over_limit: usage.over_limit,
    beneficiary_count: usage.beneficiary_count ?? 0,
    timed_message_count: usage.timed_message_count ?? 0,
    time_capsule_count: usage.time_capsule_count,
    memory_integration_count: usage.memory_integration_count,
  };
}

function normalizeBillingInvoice(item: unknown): BillingInvoice {
  const source = item && typeof item === 'object' && !Array.isArray(item)
    ? item as Record<string, unknown>
    : {};
  const created = source.created_at
    ?? source.issued_at
    ?? (typeof source.created === 'number'
      ? new Date(source.created * 1000).toISOString()
      : source.created);
  const amount = source.amount ?? source.total ?? source.amount_paid;
  return {
    ...(source as BillingInvoice),
    id: optionalString(source.id),
    url: optionalString(source.url)
      ?? optionalString(source.hosted_invoice_url)
      ?? optionalString(source.invoice_pdf),
    label: optionalString(source.label)
      ?? optionalString(source.number)
      ?? optionalString(source.id),
    created_at: typeof created === 'string' ? created : undefined,
    amount: typeof amount === 'number' && Number.isFinite(amount) ? amount : undefined,
    currency: source.currency === 'USD' || source.currency === 'NGN' ? source.currency : undefined,
    status: optionalString(source.status),
  };
}

export function normalizeBillingInvoices(payload: unknown): BillingInvoice[] {
  return normalizeCollectionResponse<unknown>(payload).data.map(normalizeBillingInvoice);
}

export function extractBillingUrl(
  payload: unknown,
  key: 'checkout_url' | 'portal_url',
): string | null {
  const raw = normalizeEntityResponse<Record<string, unknown>>(payload).data;
  return raw && typeof raw[key] === 'string' && raw[key] ? raw[key] : null;
}
