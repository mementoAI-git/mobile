import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';

export interface SubscriptionUsage {
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
  beneficiary_count?: number;
  timed_message_count?: number;
}

export interface SubscriptionSummary {
  tier: 'free' | 'pro' | 'legacy';
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused' | 'canceled';
  usage?: SubscriptionUsage;
}

export function useSubscription() {
  const query = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => get<SubscriptionSummary>(endpoint.billingSubscription).then((r) => r.data),
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
