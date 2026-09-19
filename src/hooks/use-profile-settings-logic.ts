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
  const { mutateAsync: logout, isPending } = useLogout();
  const openSheet = useUiStore((s) => s.openSheet);

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await logout();
    } catch {
      // Session termination is safely handled in onSettled
    }
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
