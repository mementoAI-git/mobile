import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';

export interface Activity {
  _id: string;
  title?: string;
  description: string;
  type?: string;
  action?: string;
  reference?: string;
  created_at: string;
  updated_at?: string;
}

interface ActivitiesResponse {
  docs: Activity[];
  totalDocs: number;
}

export function useActivities(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set('page', String(params?.page || 1));
      qs.set('limit', String(params?.limit || 4));
      return get<ActivitiesResponse>(`${endpoint.activities}?${qs.toString()}`).then(
        (r) => r.data
      );
    },
    staleTime: 60_000,
  });
}
