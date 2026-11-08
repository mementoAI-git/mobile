import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post, del, put } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { CreateBeneficiaryBody, IBeneficiary } from '@/types';

export function useUpdateBeneficiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBeneficiaryBody & { id: string }) =>
      put<IBeneficiary>(endpoint.beneficiary.replace(':id', payload.id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
    },
  });
}

export function useAddBeneficiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBeneficiaryBody) =>
      post<IBeneficiary>(endpoint.beneficiaries, payload),
    onSuccess: (res) => {
      const newBeneficiary = (res as any)?.data ?? res;
      if (newBeneficiary?._id) {
        // Append new beneficiary to the cached list instantly
        queryClient.setQueryData(queryKeys.beneficiaries, (old: any) => {
          if (Array.isArray(old)) return [...old, newBeneficiary];
          if (old?.docs) return { ...old, docs: [...old.docs, newBeneficiary] };
          return old;
        });
      } else {
        // Fallback if server doesn't return the new item
        queryClient.invalidateQueries({ queryKey: queryKeys.beneficiaries });
      }
      // Invites can add the person to groups, so member counts change too.
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    },
  });
}

export function useRemoveBeneficiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      del(endpoint.beneficiary.replace(':id', id)),
    onSuccess: (_res, id) => {
      // Instantly remove from cached list — no refetch
      queryClient.setQueryData(queryKeys.beneficiaries, (old: any) => {
        if (Array.isArray(old)) return old.filter((b: any) => b._id !== id);
        if (old?.docs) return { ...old, docs: old.docs.filter((b: any) => b._id !== id) };
        return old;
      });
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
