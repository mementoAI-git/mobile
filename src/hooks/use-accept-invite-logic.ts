import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAcceptInvite } from '@/hooks/mutations/use-beneficiary-mutations';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { useAuthStore } from '@/store';
import * as Haptics from 'expo-haptics';

export function useAcceptInviteLogic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [inviteData, setInviteData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const { mutate: accept, isPending, error: acceptError, isSuccess } = useAcceptInvite();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await get<any>(`${endpoint.getInvite}${id}`, { skipAuth: !token });
        setInviteData(res.data);
      } catch (err: any) {
        setFetchError(err.message ?? 'Invite not found or expired.');
      } finally {
        setFetching(false);
      }
    })();
  }, [id, token]);

  const handleAccept = () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!token) {
      router.push({ pathname: '/(auth)/login', params: { redirect: `/accept-invite/${id}` } } as any);
    } else {
      accept(id, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      });
    }
  };

  return {
    id,
    inviteData,
    fetching,
    fetchError,
    isPending,
    acceptError,
    isSuccess,
    handleAccept,
    token,
    router,
  };
}
