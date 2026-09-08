import {useMutation, useQueryClient} from '@tanstack/react-query';
import {patch} from '@/api/mutations';
import endpoint from '@/api/endpoint';
import {queryKeys} from '@/constants/query-keys';
import type {BillingDetailsForm} from '@/components/sheets/EditBillingDetailsSheet';
import {toBillingCountryCode} from '@/features/settings/billing-profile-update';

export function useUpdateBillingProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: BillingDetailsForm) => patch(endpoint.billingProfile, {
      email: values.email.trim(),
      name: values.name.trim(),
      address: {
        line1: (values.about === values.originalAbout ? values.line1 : values.about).trim(),
        line2: values.line2.trim() || undefined,
        city: values.city.trim() || undefined,
        state: values.state.trim() || undefined,
        postal_code: values.postalCode.trim() || undefined,
        country: toBillingCountryCode(values.country),
      },
    }),
    onSuccess: () => queryClient.invalidateQueries({queryKey: queryKeys.billingProfile}),
  });
}
