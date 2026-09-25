import { useQuery } from '@tanstack/react-query';
import { fetchAllPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store';
import type { IBeneficiary } from '@/types';

export function useBeneficiaries() {
  const token = useAuthStore((s) => s.token?.access_token);

  return useQuery({
    queryKey: queryKeys.beneficiaries,
    queryFn: () => fetchAllPaginated<IBeneficiary>(endpoint.beneficiaries),
    enabled: !!token,
    staleTime: 60_000,
  });
}
