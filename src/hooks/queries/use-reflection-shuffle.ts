import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { fetchEntity } from '@/api/domain-fetchers';
import endpoint from '@/api/endpoint';
import { useAuthStore } from '@/store';
import { reflectionShuffleKey, type ReflectionShuffleUsage } from '@/features/prompts/daily-reflections';

export function useReflectionShuffleUsage() {
  const token = useAuthStore((s) => s.token?.access_token);
  const query = useQuery({
    queryKey: reflectionShuffleKey,
    queryFn: () => fetchEntity<ReflectionShuffleUsage>(`${endpoint.prompts}/shuffle`),
    enabled: !!token,
    staleTime: 0,
  });
  const { refetch } = query;
  useEffect(() => {
    if (!token) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [token, refetch]);
  useEffect(() => {
    const reset = Date.parse(query.data?.resets_at ?? '');
    if (!token || !Number.isFinite(reset)) return;
    const timer = setTimeout(() => { void refetch(); }, Math.min(2147483647, Math.max(1000, reset - Date.now() + 100)));
    return () => clearTimeout(timer);
  }, [token, query.data?.resets_at, refetch]);
  return query;
}
