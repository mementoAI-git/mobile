import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import {
  normalizeSubscriptionSummary,
  type SubscriptionSummary,
} from '@/features/settings/billing-adapters';

import { useAuthStore } from '@/store';

export type {
  SubscriptionSummary,
  SubscriptionUsage,
} from '@/features/settings/billing-adapters';

export function useSubscription() {
  const token = useAuthStore((s) => s.token?.access_token);

  const query = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => get<unknown>(endpoint.billingSubscription).then(normalizeSubscriptionSummary),
    enabled: !!token,
    staleTime: 30_000,
    retry: false,
  });

  const summary = query.data;
  const usage = summary?.usage;
  const tier = summary?.tier ?? 'free';
  const isProOrAbove = tier === 'pro' || tier === 'legacy';

  return {
    ...query,
    summary,
    usage,
    tier,
    isProOrAbove,
  };
}
