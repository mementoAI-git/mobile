import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfile } from '@/hooks/queries/use-profile';
import { useUserStats } from '@/hooks/queries/use-overview';
import { useLogout } from '@/hooks/mutations/use-auth-mutations';
import { useUiStore } from '@/store';
import * as Haptics from 'expo-haptics';

export function useProfileSettingsLogic() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: stats } = useUserStats();
  const { mutate: logout, isPending } = useLogout();
  const openSheet = useUiStore((s) => s.openSheet);

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          logout(undefined, { onSuccess: () => router.replace('/(auth)/login') });
        },
      },
    ]);
  };

  const enrichmentScore = Number(stats?.enrichment_score) || 0;
  const memoriesCount = Number(stats?.stories_count) || 0;
  const streakCount = Number(profile?.streak) || Number(stats?.streak_count) || 0;
  const topDimension = stats?.top_dimension || 'Values & Lessons';

  return {
    profile,
    stats,
    isPending,
    handleLogout,
    openSheet,
    enrichmentScore,
    memoriesCount,
    streakCount,
    topDimension,
    router,
  };
}
