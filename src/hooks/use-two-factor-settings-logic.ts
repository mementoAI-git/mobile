import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/queries/use-profile';
import { post, del } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '@/store';

export function useTwoFactorSettingsLogic() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const openSheet = useUiStore((s) => s.openSheet);
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
      return res.data;
    } catch (err: any) {
      setError(err.message ?? 'Couldn’t set up two-factor authentication.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const handleVerify = async () => {
    if (!token.trim()) return false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    try {
      await post(endpoint.verifyTOTP, { token: token.trim() });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      setSetupData(null);
      setToken('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (err: any) {
      setError(err.message ?? 'Enter a valid verification code.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disableNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    try {
      await del(endpoint.disable2FA);
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message ?? 'Couldn’t turn off two-factor authentication.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    openSheet('security-confirmation', {
      kind: 'disable-two-factor',
      onConfirm: disableNow,
    });
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
    disableNow,
    router,
  };
}
