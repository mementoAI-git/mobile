import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Avatar, ResponsiveScreen } from '@/components/ui';
import { useUiStore } from '@/store';
import {
  UiCreditCard01,
  UiEye,
  UiLogOut01,
  UiMessageChatSquare,
  UiShieldTick,
  UiUserCircle,
  UiUsers01,
} from '@/components/ui/icons/SettingsIcons';
import { SettingsHubRow } from '@/components/settings/SettingsHubRow';
import { PlanSummaryBanner } from '@/components/subscription/PlanSummaryBanner';
import { OnboardingReminderCard } from '@/components/onboarding/OnboardingReminderCard';
import { useSubscription } from '@/hooks/queries/use-subscription';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';
import { useProfileSettingsLogic } from '@/hooks/use-profile-settings-logic';
import { useVoiceScroll } from '@/features/voice-control/hooks';
import Animated from 'react-native-reanimated';

const X_ICON = require('../../assets/images/icons/x.png');
const DISCORD_ICON = require('../../assets/images/icons/discord-colored.png');
const FACEBOOK_ICON = require('../../assets/images/icons/facebook-colored.png');
const LINKEDIN_ICON = require('../../assets/images/icons/linkedin-colored.png');

const COMMUNITY_LINKS = [
  { label: 'X (Twitter)', icon: X_ICON, url: 'https://x.com' },
  { label: 'Discord', icon: DISCORD_ICON, url: 'https://discord.com' },
  { label: 'Facebook', icon: FACEBOOK_ICON, url: 'https://facebook.com' },
  { label: 'LinkedIn', icon: LINKEDIN_ICON, url: 'https://linkedin.com' },
] as const;

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

  const openCommunity = useCallback((url: string) => {
    Haptics.selectionAsync();
    Linking.openURL(url).catch(() => { });
  }, []);

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

        {/* Labels and order match web settings-hub.tsx. */}
        <View>
          <SettingsHubRow
            label="Personal info"
            icon={<UiUserCircle size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/profile')}
          />
          <SettingsHubRow
            label="Security"
            icon={<UiShieldTick size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/account')}
          />
          <SettingsHubRow
            label="People & Groups"
            icon={<UiUsers01 size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/beneficiaries')}
          />
          <SettingsHubRow
            label="Privacy & Account"
            icon={<UiEye size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/privacy')}
          />
          <SettingsHubRow
            label="Billing"
            icon={<UiCreditCard01 size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/billing')}
          />
          <SettingsHubRow
            label="Send Feedback"
            icon={<UiMessageChatSquare size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/feedback')}
            showChevron={false}
          />
        </View>

        <TouchableOpacity
          onPress={() => openSheet('security-confirmation', {
            kind: 'logout-current-device',
            onConfirm: handleLogout,
          })}
          disabled={isPending}
          activeOpacity={0.75}
          style={styles.logout}
        >
          <UiLogOut01 size={24} color={COLORS.error} />
          <Text style={[TYPE.label, { color: COLORS.error }]}>Logout</Text>
        </TouchableOpacity>

        <Text style={[TYPE.metadata, styles.communityLabel]}>JOIN OUR COMMUNITY</Text>
        <View style={styles.communityRow}>
          {COMMUNITY_LINKS.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => openCommunity(item.url)}
              activeOpacity={0.78}
              style={styles.communityCard}
            >
              {item.icon ? (
                <Image
                  source={item.icon}
                  // The X mark is monochrome black artwork; tint it so it reads in every theme.
                  style={[styles.communityIcon, item.label === 'X (Twitter)' && { tintColor: COLORS.textStrong }]}
                  resizeMode="contain"
                />
              ) : (
                <MessageCircle size={28} color={COLORS.info} fill={COLORS.info} />
              )}
              <Text numberOfLines={1} style={styles.communityText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
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
  logout: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  communityLabel: {
    marginTop: 48,
    color: COLORS.textWeak,
  },
  communityRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 14,
  },
  communityCard: {
    flex: 1,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
  },
  communityIcon: { width: 28, height: 28 },
  communityText: {
    color: COLORS.textStrong,
    ...TYPE.eyebrow,
    marginTop: 6,
  },
  version: {
    color: COLORS.textWeak,
    ...TYPE.metadata,
    textAlign: 'center',
    marginTop: 14,
  },
});
