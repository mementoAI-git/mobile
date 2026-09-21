import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import {
  normalizeBillingInvoices,
  normalizeBillingProfile,
  normalizeBillingUsage,
  type BillingInvoice,
  type BillingUsage,
  type BillingProfile,
} from '@/features/settings/billing-adapters';

export type { BillingInvoice, BillingUsage } from '@/features/settings/billing-adapters';

/**
 * @todo billing-v2
 * In-app billing profile editing is deferred until the backend implements
 * a dedicated endpoint.billingProfile. In the interim, billing details and
 * payment methods are securely managed via the Polar customer portal (openBillingPortal).
 */
export function useBillingProfile() {
  return useQuery<BillingProfile | null>({
    queryKey: queryKeys.billingProfile,
    queryFn: () => Promise.resolve(null),
    staleTime: Infinity,
    retry: false,
  });
}

export function useBillingInvoices(enabled = true) {
  return useQuery<BillingInvoice[]>({
    queryKey: queryKeys.billingInvoices,
    queryFn: () => get<unknown>(endpoint.billingInvoices).then(normalizeBillingInvoices),
    enabled,
    staleTime: 30_000,
  });
}

export function useBillingUsage() {
  return useQuery<BillingUsage | null>({
    queryKey: queryKeys.billingUsage,
    queryFn: () => get<unknown>(endpoint.billingUsage).then(normalizeBillingUsage),
    staleTime: 30_000,
  });
}
