import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store';
import {
  normalizeBillingInvoices,
  normalizeBillingUsage,
  type BillingInvoice,
  type BillingUsage,
} from '@/features/settings/billing-adapters';

export type { BillingInvoice, BillingUsage } from '@/features/settings/billing-adapters';

export function useBillingInvoices(enabled = true) {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery<BillingInvoice[]>({
    queryKey: queryKeys.billingInvoices,
    queryFn: () => get<unknown>(endpoint.billingInvoices).then(normalizeBillingInvoices),
    enabled: !!token && enabled,
    staleTime: 30_000,
  });
}

export function useBillingUsage() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery<BillingUsage | null>({
    queryKey: queryKeys.billingUsage,
    queryFn: () => get<unknown>(endpoint.billingUsage).then(normalizeBillingUsage),
    enabled: !!token,
    staleTime: 30_000,
  });
}

