import {useMutation, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/constants/query-keys';
import type {BillingDetailsForm} from '@/components/sheets/EditBillingDetailsSheet';

export function useUpdateBillingProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_values: BillingDetailsForm) => {
      // Customer profile and billing management is handled securely via Polar Customer Portal.
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: queryKeys.billingProfile});
      queryClient.invalidateQueries({queryKey: queryKeys.profile});
    },
  });
}
