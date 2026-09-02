import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import {
  normalizeBillingInvoices,
  normalizeBillingUsage,
  type BillingInvoice,
  type BillingUsage,
} from '@/features/settings/billing-adapters';

export type { BillingInvoice, BillingUsage } from '@/features/settings/billing-adapters';

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
