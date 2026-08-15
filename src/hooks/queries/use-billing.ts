import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';

export interface BillingInvoice {
  url?: string;
  label?: string;
}

export interface BillingUsage {
  storage_used_bytes: number;
  storage_limit_bytes: number;
  beneficiary_count: number;
  timed_message_count: number;
}

export function useBillingInvoices(enabled = true) {
  return useQuery<BillingInvoice[]>({
    queryKey: queryKeys.billingInvoices,
    queryFn: () => get<{ data: BillingInvoice[] }>(endpoint.billingInvoices).then((r) => r.data?.data ?? []),
    enabled,
    staleTime: 30_000,
  });
}

export function useBillingUsage() {
  return useQuery<BillingUsage | null>({
    queryKey: queryKeys.billingUsage,
    queryFn: () => get<{ data: BillingUsage }>(endpoint.billingUsage).then((r) => r.data?.data ?? null),
    staleTime: 30_000,
  });
}