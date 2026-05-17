import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/queries/use-profile';
import { post, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import * as Haptics from 'expo-haptics';

export function useTwoFactorSettingsLogic() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const is2FAEnabled = profile?.two_factor?.enabled ?? false;

  const [setupData, setSetupData] = useState<{ qr_code?: string; secret?: string } | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSetup = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const res = await post<any>(endpoint.setup2FA);
      setSetupData(res.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message ?? 'Failed to setup 2FA');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!token.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    try {
      await post(endpoint.verifyTOTP, { token: token.trim() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      setSetupData(null);
      setToken('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message ?? 'Invalid token');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Disable 2FA', 'Are you sure you want to disable two-factor authentication?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setLoading(true);
          try {
            await del(endpoint.disable2FA);
            queryClient.invalidateQueries({ queryKey: queryKeys.profile });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (err: any) {
            setError(err.message ?? 'Failed to disable 2FA');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return {
    is2FAEnabled,
    setupData,
    token,
    setToken,
    loading,
    error,
    handleSetup,
    handleVerify,
    handleDisable,
    router,
  };
}
