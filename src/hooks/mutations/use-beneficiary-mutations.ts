import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IBeneficiary } from '@/types';

export function useAddBeneficiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; email: string; relationship: string }) =>
      post<IBeneficiary>(endpoint.beneficiaries, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
    },
  });
}

export function useRemoveBeneficiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del(endpoint.beneficiary.replace(':id', id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: (email: string) =>
      post(endpoint.resendInvite, { email }),
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (invite_code: string) =>
      post(endpoint.acceptInvite, { invite_code }),
  });
}
