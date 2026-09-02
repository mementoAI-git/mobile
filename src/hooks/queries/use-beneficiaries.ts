import { useQuery } from '@tanstack/react-query';
import { fetchAllPaginated } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IBeneficiary } from '@/types';

export function useBeneficiaries() {
  return useQuery({
    queryKey: queryKeys.beneficiaries,
    queryFn: () => fetchAllPaginated<IBeneficiary>(endpoint.beneficiaries),
    staleTime: 60_000,
  });
}
