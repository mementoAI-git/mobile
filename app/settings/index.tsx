import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Avatar, ResponsiveScreen } from '@/components/ui';
import { useUiStore } from '@/store';
import CreditCard from 'lucide-react-native/icons/credit-card';
import LockKeyhole from 'lucide-react-native/icons/lock-keyhole';
import LogOut from 'lucide-react-native/icons/log-out';
import MessageSquare from 'lucide-react-native/icons/message-square';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import UserRound from 'lucide-react-native/icons/user-round';
import UsersRound from 'lucide-react-native/icons/users-round';
import { SettingsGroupedList, SettingsHubRow } from '@/components/settings/SettingsHubRow';
import { PlanSummaryBanner } from '@/components/subscription/PlanSummaryBanner';
import { OnboardingReminderCard } from '@/components/onboarding/OnboardingReminderCard';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';
import { useProfileSettingsLogic } from '@/hooks/use-profile-settings-logic';
import { useVoiceScroll } from '@/features/voice-control/hooks';
import Animated from 'react-native-reanimated';


export default function SettingsIndex() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const {
    profile,
    isPending,
    handleLogout,
    openSheet,
  } = useProfileSettingsLogic();
  const {
    isProOrAbove,
    summary,
    isLoading: subscriptionLoading,
  } = useSubscription();
  const router = useRouter();
  // Same name and joined-date rules as web settings-profile-header.tsx.
  const rawDisplayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const displayName = rawDisplayName || profile?.nickname?.trim() || 'Your name';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  // Lets voice scroll this screen ("scroll down", "go to the top").
  const voiceScrollRef = useVoiceScroll<Animated.ScrollView>();
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  }, [router]);

  const push = useCallback((href: string) => {
    router.push(href as never);
  }, [router]);

  const handleManagePlan = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/pricing');
  }, [router]);


  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ResponsiveScreen maxWidth={720}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.78}
            accessibilityRole="button"
            style={styles.backButton}
          >
            <ArrowLeft size={22} color={COLORS.textBase} />
          </TouchableOpacity>
          <Text style={[TYPE.screenTitle, { color: COLORS.textStrong }]}>Settings</Text>
          <View style={{ width: 44 }} />
        </View>

        <Animated.ScrollView
          ref={voiceScrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
        <View style={styles.topCards}>
          <TouchableOpacity
            onPress={() => {
              void Haptics.selectionAsync();
              push('/settings/profile');
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${displayName}, personal information`}
            style={styles.profileCard}
          >
            <Avatar
              uri={profile?.picture_url || profile?.picture}
              userId={profile?._id} seed={profile?.email}
              name={rawDisplayName || undefined}
              size="xl"
              className="h-16 w-16 border-0"
            />
            <View style={styles.profileCopy}>
              <Text style={[TYPE.profileName, { color: COLORS.textStrong }]}>{displayName}</Text>
              {/* Web joins these with a dot on one line; a phone card is too narrow, so they stack. */}
              {profile?.email ? (
                <Text numberOfLines={1} style={[TYPE.bodySmall, styles.profileMetaText]}>{profile.email}</Text>
              ) : null}
              {memberSince ? (
                <Text style={[TYPE.bodySmall, styles.profileMetaText]}>Joined {memberSince}</Text>
              ) : null}
            </View>
          </TouchableOpacity>

          <PlanSummaryBanner
            compact
            isProOrAbove={isProOrAbove}
            subscriptionKnown={Boolean(summary) && !subscriptionLoading}
            onPress={handleManagePlan}
            tier={summary?.tier}
            status={summary?.status}
            cancelAtPeriodEnd={summary?.cancel_at_period_end}
            provider={summary?.provider}
          />

          <OnboardingReminderCard />
        </View>

        {/* Labels, order, icons and grouped cards match web settings-hub.tsx. */}
        <View style={styles.groups}>
          <SettingsGroupedList>
            <SettingsHubRow
              isFirst
              label="Personal info"
              icon={<UserRound size={20} color={COLORS.textStrong} strokeWidth={1.75} />}
              onPress={() => push('/settings/profile')}
            />
            <SettingsHubRow
              label="Security"
              icon={<LockKeyhole size={20} color={COLORS.textStrong} strokeWidth={1.75} />}
              onPress={() => push('/settings/account')}
            />
            <SettingsHubRow
              label="People & Groups"
              icon={<UsersRound size={20} color={COLORS.textStrong} strokeWidth={1.75} />}
              onPress={() => push('/settings/beneficiaries')}
            />
            <SettingsHubRow
              label="Privacy & Account"
              icon={<ShieldCheck size={20} color={COLORS.textStrong} strokeWidth={1.75} />}
              onPress={() => push('/settings/privacy')}
            />
            <SettingsHubRow
              label="Billing"
              icon={<CreditCard size={20} color={COLORS.textStrong} strokeWidth={1.75} />}
              onPress={() => push('/settings/billing')}
            />
            <SettingsHubRow
              isLast
              label="Send Feedback"
              icon={<MessageSquare size={20} color={COLORS.textStrong} strokeWidth={1.75} />}
              onPress={() => push('/settings/feedback')}
              showChevron={false}
            />
          </SettingsGroupedList>

          <SettingsGroupedList>
            <SettingsHubRow
              isFirst
              isLast
              label={isPending ? 'Logging out…' : 'Logout'}
              icon={<LogOut size={20} color={COLORS.textStrong} strokeWidth={1.75} />}
              onPress={() => openSheet('security-confirmation', {
                kind: 'logout-current-device',
                onConfirm: handleLogout,
              })}
              disabled={isPending}
              showChevron={false}
            />
          </SettingsGroupedList>
        </View>

        <Text style={styles.version}>Memento AI v1.0</Text>

      </Animated.ScrollView>
      </ResponsiveScreen>

    </SafeAreaView>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
  },
  content: { paddingTop: 28, paddingBottom: 24 },
  // Web: profile header and plan card stack with gap-4, then gap-10 to the section list.
  topCards: { gap: 16, marginBottom: 40 },
  profileCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.fillWeak,
  },
  profileCopy: { flex: 1, minWidth: 0, gap: 4 },
  profileMetaText: { color: COLORS.textBase },
  // Web: the section list and the logout card sit 16px apart.
  groups: { gap: 16 },
  version: {
    color: COLORS.textWeak,
    ...TYPE.metadata,
    textAlign: 'center',
    marginTop: 48,
  },
});
