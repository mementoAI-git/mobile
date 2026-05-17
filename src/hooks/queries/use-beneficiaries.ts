import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IBeneficiary } from '@/types';

export function useBeneficiaries() {
  return useQuery({
    queryKey: queryKeys.beneficiaries,
    queryFn: () => get<IBeneficiary[]>(endpoint.beneficiaries).then((r) => r.data),
    staleTime: 60_000,
  });
}
