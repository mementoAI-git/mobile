import React, { useCallback, useState } from 'react';
import { OnboardingCelebrationOverlay } from '@/components/onboarding/OnboardingCelebrationOverlay';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui';
import { useUiStore } from '@/store';
import {
  UiClock01,
  UiCreditCard01,
  UiEye,
  UiLogOut01,
  UiMessageChatSquare,
  UiShieldTick,
  UiUserCircle,
  UiUsers01,
} from '@/components/ui/icons/SettingsIcons';
import { SettingsHubRow } from '@/components/settings/SettingsHubRow';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';
import { useProfileSettingsLogic } from '@/hooks/use-profile-settings-logic';

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
  const {
    profile,
    isPending,
    handleLogout,
    openSheet,
  } = useProfileSettingsLogic();
  const [showVaultCelebration, setShowVaultCelebration] = useState(false);
  const router = useRouter();
  const displayName = profile?.fullname?.trim()
    || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
    || profile?.nickname
    || 'Your account';
  const memberSince = profile?.created_at
    ? `Member since ${new Date(profile.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })}`
    : null;

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  }, [router]);

  const push = useCallback((href: string) => {
    router.push(href as never);
  }, [router]);

  const openCommunity = useCallback((url: string) => {
    Haptics.selectionAsync();
    Linking.openURL(url).catch(() => { });
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.78}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <Text style={TYPE.screenTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity
          onPress={() => push('/settings/profile')}
          activeOpacity={0.8}
          style={styles.profileCard}
        >
          <Avatar
            uri={profile?.picture_url || profile?.picture}
            seed={profile?.email || profile?._id}
            name={displayName}
            size="xl"
            className="h-14 w-14 border-0"
          />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={TYPE.cardTitle}>{displayName}</Text>
            <Text numberOfLines={1} style={styles.profileEmail}>{profile?.email}</Text>
            {memberSince && <Text style={styles.memberSince}>{memberSince}</Text>}
          </View>
          <ChevronRight size={21} color={COLORS.textBase} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={{ marginTop: 20 }}>
          <SettingsHubRow
            label="Personal information"
            icon={<UiUserCircle size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/profile')}
          />
          <SettingsHubRow
            label="Security"
            icon={<UiShieldTick size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/account')}
          />
          <SettingsHubRow
            label="Privacy"
            icon={<UiEye size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/privacy')}
          />
          <SettingsHubRow
            label="Beneficiaries"
            icon={<UiUsers01 size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/beneficiaries')}
          />
          <SettingsHubRow
            label="Billing"
            icon={<UiCreditCard01 size={24} color={COLORS.textBase} />}
            onPress={() => push('/settings/billing')}
          />
          <SettingsHubRow
            label="Daily reflection ritual"
            icon={<UiClock01 size={24} color={COLORS.textBase} />}
            onPress={() => openSheet('daily-ritual')}
          />
          <SettingsHubRow
            label="Send feedback"
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
          <Text style={[TYPE.label, { color: COLORS.error }]}>Log out</Text>
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
                <Image source={item.icon} style={styles.communityIcon} resizeMode="contain" />
              ) : (
                <MessageCircle size={28} color={COLORS.info} fill={COLORS.info} />
              )}
              <Text numberOfLines={1} style={styles.communityText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.version}>Memento AI v1.0</Text>

        {__DEV__ && (
          <View className="mt-8 p-4 rounded-3xl bg-fill-weaker border border-stroke-weaker">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="size-2 rounded-full bg-brand" />
              <Text className="text-text-strong uppercase tracking-wider" style={TYPE.metadata}>
                Ceremonial Experience Lab
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <TouchableOpacity
                onPress={() => {
                  void Haptics.selectionAsync();
                  openSheet('first-story-milestone');
                }}
                className="bg-white border border-stroke-weaker px-3 py-2 rounded-full"
              >
                <Text style={{ ...TYPE.buttonSmall, color: COLORS.brand }}>
                  📖 First Story
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void Haptics.selectionAsync();
                  openSheet('voice-debrief', {
                    duration: 185,
                    userSpeechText: 'Remembering walking through the old orchard with grandfather in the autumn of 2012...',
                    aiSpeechText: 'A story of heritage, quiet resilience, and family warmth.',
                  });
                }}
                className="bg-white border border-stroke-weaker px-3 py-2 rounded-full"
              >
                <Text style={{ ...TYPE.buttonSmall, color: COLORS.brand }}>
                  🎙️ Voice Debrief
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void Haptics.selectionAsync();
                  openSheet('capsule-sealed', {
                    title: 'Letters for Graduation',
                    scheduledDate: '2035-10-14',
                    recipientsCount: 2,
                  });
                }}
                className="bg-white border border-stroke-weaker px-3 py-2 rounded-full"
              >
                <Text style={{ ...TYPE.buttonSmall, color: COLORS.brand }}>
                  ⏳ Capsule Sealed
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void Haptics.selectionAsync();
                  openSheet('upgrade-success');
                }}
                className="bg-white border border-stroke-weaker px-3 py-2 rounded-full"
              >
                <Text style={{ ...TYPE.buttonSmall, color: COLORS.brand }}>
                  👑 Pro Upgrade
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void Haptics.selectionAsync();
                  openSheet('daily-ritual');
                }}
                className="bg-white border border-stroke-weaker px-3 py-2 rounded-full"
              >
                <Text style={{ ...TYPE.buttonSmall, color: COLORS.brand }}>
                  ⏰ Reflection Window
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void Haptics.selectionAsync();
                  setShowVaultCelebration(true);
                }}
                className="bg-white border border-stroke-weaker px-3 py-2 rounded-full"
              >
                <Text style={{ ...TYPE.buttonSmall, color: COLORS.brand }}>
                  🏛️ Vault Celebration
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <OnboardingCelebrationOverlay
        visible={showVaultCelebration}
        interactiveLabMode
        preferredName={profile?.nickname || profile?.first_name || 'Friend'}
        onClose={() => setShowVaultCelebration(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 62,
    paddingHorizontal: 16,
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
  content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 24 },
  profileCard: {
    minHeight: 80,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.fillWeak,
  },
  profileEmail: {
    color: COLORS.textStrong,
    ...TYPE.bodySmall,
    marginTop: 2,
  },
  memberSince: {
    color: COLORS.textWeak,
    ...TYPE.metadata,
    marginTop: 2,
  },
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
  },
  communityRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 14,
  },
  communityCard: {
    flex: 1,
    minHeight: 64,
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
