import { useMutation, useQueryClient } from '@tanstack/react-query';
import { del, patch } from '@/api/mutations';
import { queryKeys } from '@/constants/query-keys';
import {
  observationUrl,
  type PersonaObservationsResponse,
} from '@/features/insights/insights-model';

/** Saves a note in the member's own words. Memento uses this version from then on. */
export function useEditObservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, heading, note }: { id: string; heading: string; note: string }) =>
      patch(observationUrl(id), { heading, note }),
    onSuccess: (_response, { id, heading, note }) => {
      queryClient.setQueryData<PersonaObservationsResponse | null>(queryKeys.observations, (current) =>
        current
          ? {
              ...current,
              observations: current.observations.map((item) =>
                item.id === id ? { ...item, heading, note } : item,
              ),
            }
          : current,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.observations }),
  });
}

/** Takes the note off the list straight away, and puts it back if forgetting fails. */
export function useForgetObservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(observationUrl(id)),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.observations });
      const previous = queryClient.getQueryData<PersonaObservationsResponse | null>(queryKeys.observations);
      queryClient.setQueryData<PersonaObservationsResponse | null>(queryKeys.observations, (current) =>
        current
          ? { ...current, observations: current.observations.filter((item) => item.id !== id) }
          : current,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.observations, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.observations }),
  });
}
