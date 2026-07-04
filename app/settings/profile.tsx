import React, { useCallback } from 'react';
import { View, ScrollView, ImageBackground, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react-native';
import { UiLock01, UiEye, UiUsers01, UiPhone01, UiMessageChatSquare, UiCreditCard01, UiLogOut01, UiZapFast, UiDatabase01 } from '@/components/ui/icons/SettingsIcons';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/ui';
import { Separator } from '@/components/ui/Separator';
import { useProfileSettingsLogic } from '@/hooks/use-profile-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';

const HEADER_BG = require('../../assets/images/backgrounds/welcome_bg.png');
const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

// ─── Nav items with individual tint colors ──────────────────────────────────

const NAV_ITEMS = [
  { label: 'Security',      desc: 'Password, biometrics and login',       Icon: UiLock01,            href: '/settings/account',      iconBg: `${COLORS.brand}12`,   iconColor: COLORS.brand   },
  { label: 'Privacy',       desc: 'Visibility, data and AI preferences',   Icon: UiEye,               href: '/settings/privacy',       iconBg: `${COLORS.info}12`,    iconColor: COLORS.info    },
  { label: 'Beneficiaries', desc: 'Manage your trusted circle',            Icon: UiUsers01,           href: '/settings/beneficiaries', iconBg: `${COLORS.success}12`, iconColor: COLORS.success },
  { label: '2FA',           desc: 'Two-factor authentication',             Icon: UiPhone01,           href: '/settings/two-factor',    iconBg: `${COLORS.warning}12`, iconColor: COLORS.warning },
  { label: 'Billing',       desc: 'Plan, payments and usage',              Icon: UiCreditCard01,      href: '/settings/billing',       iconBg: `${COLORS.brand}12`,   iconColor: COLORS.brand   },
  { label: 'Activity',      desc: 'Your recent actions and history',       Icon: UiZapFast,           href: '/settings/activities',    iconBg: `${COLORS.success}12`, iconColor: COLORS.success },
  { label: 'Feedback',      desc: 'Share thoughts and suggestions',        Icon: UiMessageChatSquare, href: '__feedback__',            iconBg: COLORS.fillWeak,       iconColor: COLORS.textBase },
];

// ─── Animated pressable row ───────────────────────────────────────────────────

function NavRow({
  label, desc, Icon, iconBg, iconColor, onPress, isLast,
}: {
  label: string;
  desc: string;
  Icon: any;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  isLast: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => { scale.value = withSpring(0.98, { damping: 20, stiffness: 300 }); }, [scale]);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1, { damping: 20, stiffness: 300 }); }, [scale]);

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.navRow}
      >
        <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
          <Icon size={19} color={iconColor} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.navLabel}>{label}</Text>
          <Text style={styles.navDesc}>{desc}</Text>
        </View>
        <ChevronRight size={16} color={COLORS.textMuted} strokeWidth={2} />
      </TouchableOpacity>
      {!isLast && <Separator style={{ opacity: 0.6 }} />}
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileSettingsScreen() {
  const {
    profile,
    isPending,
    handleLogout,
    openSheet,
    enrichmentScore,
    memoriesCount,
    streakCount,
    router,
  } = useProfileSettingsLogic();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            if (router.canGoBack()) router.back();
            else router.replace('/settings');
          }}
          style={styles.backBtn}
        >
          <ChevronLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Account</Text>
          <Text style={styles.headerSubtitle}>Your account, your story.</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
        <ImageBackground source={PATTERN} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.03 }} resizeMode="repeat" />

        {/* ── Profile Hero Card ── */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.heroWrap}>
          <ImageBackground
            source={HEADER_BG}
            style={styles.heroCard}
            imageStyle={{ borderRadius: 32 }}
          >
            {/* Avatar + name row */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarRing}>
                <Avatar
                  uri={profile?.picture_url}
                  name={profile?.fullname ?? profile?.first_name}
                  size="xl"
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {(profile?.fullname ?? `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()) || 'Your Name'}
                </Text>
                <Text style={styles.heroEmail} numberOfLines={1}>
                  {profile?.email}
                </Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>ENRICHMENT</Text>
                <Text style={[styles.statValue, { color: COLORS.brand }]}>{enrichmentScore}%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>STORIES</Text>
                <Text style={styles.statValue}>{memoriesCount}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>STREAK</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Flame size={15} color={COLORS.brand} />
                  <Text style={styles.statValue}>{streakCount}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>
        </Animated.View>

        {/* ── Settings Group Card ── */}
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.groupWrap}>
          <View style={{ gap: 4, marginLeft: 4, marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>Settings & Privacy</Text>
            <Text style={styles.sectionSubtitle}>Manage your account and preferences</Text>
          </View>

          <View style={styles.groupCard}>
            {NAV_ITEMS.map((item, idx) => (
              <NavRow
                key={item.href}
                label={item.label}
                desc={item.desc}
                Icon={item.Icon}
                iconBg={item.iconBg}
                iconColor={item.iconColor}
                isLast={idx === NAV_ITEMS.length - 1}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (item.href === '__feedback__') openSheet('feedback');
                  else router.push(item.href as any);
                }}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Sign Out ── */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.logoutWrap}>
          <TouchableOpacity
            onPress={handleLogout}
            disabled={isPending}
            style={styles.logoutBtn}
            activeOpacity={0.8}
          >
            <UiLogOut01 size={19} color={COLORS.error} strokeWidth={2} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>MEMENTO V1.0.0</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.fillWeaker,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.serif,
    fontSize: 28,
    color: COLORS.textStrong,
    lineHeight: 34,
  },
  headerSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textWeak,
    marginTop: 1,
  },

  // Hero card
  heroWrap: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  heroCard: {
    borderRadius: 32,
    overflow: 'hidden',
    padding: 24,
    backgroundColor: COLORS.card,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    overflow: 'hidden',
  },
  heroName: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: COLORS.textStrong,
    lineHeight: 28,
  },
  heroEmail: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textWeak,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.strokeWeaker}60`,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: FONTS.sansBold,
    fontSize: 28,
    color: COLORS.textStrong,
    lineHeight: 34,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.strokeWeaker,
  },

  // Settings group
  groupWrap: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textWeak,
  },
  groupCard: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    minHeight: 64,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 15,
    color: COLORS.textStrong,
  },
  navDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.textWeak,
  },

  // Logout
  logoutWrap: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 56,
    borderRadius: 999,
    backgroundColor: `${COLORS.error}06`,
    borderWidth: 1,
    borderColor: `${COLORS.error}18`,
  },
  logoutText: {
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    color: COLORS.error,
  },
  versionText: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: COLORS.textDisabled,
    letterSpacing: 1.5,
  },
});
