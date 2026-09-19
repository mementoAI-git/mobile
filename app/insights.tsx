import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Settings,
  Award,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  InsightsContentCard,
  type InsightsTab,
} from '@/components/account/InsightsContentCard';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Skeleton } from '@/components/ui';
import { calculateMilestones } from '@/features/insights/milestone-celebrations';
import { useProfile } from '@/hooks/queries/use-profile';
import { useUserStats, useCapsuleStats, useMemoriesStats } from '@/hooks/queries/use-overview';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { useUserStore } from '@/store';
import {
  usePersona,
  useUserContext,
} from '@/hooks/queries/use-persona';

const PATTERN = require('../assets/images/backgrounds/welcome_bg.png');
const STREAK_BG = require('../assets/images/backgrounds/streak_card_bg.png');

const TABS: { key: InsightsTab; label: string }[] = [
  { key: 'enrichment', label: 'Enrichment score' },
  { key: 'insights', label: 'Insights' },
  { key: 'notes', label: 'Notes' },
  { key: 'preferences', label: 'Preferences' },
];

function InsightsSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 18 }}>
      <Skeleton className="h-[280px] w-full rounded-[24px]" />
      <Skeleton className="h-[300px] w-full rounded-[24px]" />
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<InsightsTab>('enrichment');
  const user = useUserStore((s) => s.user);
  const { data: profile } = useProfile();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: memoriesStats } = useMemoriesStats();
  const { data: capsuleStats } = useCapsuleStats();
  const { data: beneficiariesRaw } = useBeneficiaries();
  const { data: persona } = usePersona();
  const { data: context } = useUserContext();

  const insightSource = persona ?? context;
  const insights = useMemo(
    () => [
      ...(insightSource?.goals_and_aspirations ?? []),
      ...(insightSource?.emotional_state_trends ?? []),
      ...(insightSource?.current_priority ?? []),
    ],
    [insightSource],
  );
  const notes = insightSource?.important_notes ?? [];
  const preferences = insightSource?.key_preferences ?? [];
  const nickname = user?.nickname?.trim() || profile?.nickname?.trim();
  const firstName = user?.first_name?.trim() || profile?.first_name?.trim();
  const gender = user?.gender || profile?.gender;

  const pronounSubject = gender === 'female' ? 'She' : gender === 'male' ? 'He' : 'They';
  const pronounSubjectLower = gender === 'female' ? 'she' : gender === 'male' ? 'he' : 'they';
  const pronounPossessive = gender === 'female' ? 'Her' : gender === 'male' ? 'His' : 'Their';
  const pronounPossessiveLower = gender === 'female' ? 'her' : gender === 'male' ? 'his' : 'their';

  // Resolved identity: nickname > first name > third-person pronoun
  const resolvedName = nickname || firstName;

  const sanitizeText = useCallback((text: string) => {
    if (!text) return '';
    if (resolvedName) {
      return text
        .replace(/\bThe user's\b/g, `${resolvedName}'s`)
        .replace(/\bthe user's\b/g, `${resolvedName}'s`)
        .replace(/\bThe user\b/g, resolvedName)
        .replace(/\bthe user\b/g, resolvedName);
    }
    return text
      .replace(/\bThe user's\b/g, pronounPossessive)
      .replace(/\bthe user's\b/g, pronounPossessiveLower)
      .replace(/\bThe user\b/g, pronounSubject)
      .replace(/\bthe user\b/g, pronounSubjectLower);
  }, [resolvedName, pronounPossessive, pronounPossessiveLower, pronounSubject, pronounSubjectLower]);

  const sanitizedInsights = useMemo(() => {
    return insights.map(sanitizeText);
  }, [insights, sanitizeText]);

  const sanitizedNotes = useMemo(() => {
    return notes.map((note: string) => sanitizeText(note));
  }, [notes, sanitizeText]);

  const sanitizedPreferences = useMemo(() => {
    return preferences.map(sanitizeText);
  }, [preferences, sanitizeText]);

  const { milestoneStats, milestones } = useMemo(() => {
    const memoryCount = Number(stats?.stories_count ?? memoriesStats?.stories_count) || 0;
    const streakDays = Number(user?.streak ?? stats?.streak_count ?? profile?.streak) || 0;
    const capsuleCount = Number(capsuleStats?.scheduled_count ?? capsuleStats?.delivered_count) || 0;
    const beneficiaryCount = (() => {
      if (stats?.beneficiary_count != null && Number(stats.beneficiary_count) > 0) {
        return Number(stats.beneficiary_count);
      }
      if (Array.isArray(beneficiariesRaw)) return beneficiariesRaw.length;
      if ((beneficiariesRaw as any)?.totalDocs != null) return Number((beneficiariesRaw as any).totalDocs);
      if ((beneficiariesRaw as any)?.docs) return (beneficiariesRaw as any).docs.length;
      return 0;
    })();

    const list = calculateMilestones({
      memoryCount,
      streakDays,
      capsuleCount,
      enrichmentScore: Number(stats?.enrichment_score) || 0,
      beneficiaryCount,
    });

    return {
      milestoneStats: { memoryCount, streakDays, capsuleCount, beneficiaryCount },
      milestones: list,
    };
  }, [stats, memoriesStats, user, profile, capsuleStats, beneficiariesRaw]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  }, [router]);

  const handleSettings = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/settings');
  }, [router]);

  const selectTab = useCallback((tab: InsightsTab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
  }, []);

  const achievedCount = useMemo(
    () => milestones.filter((m) => m.achieved).length,
    [milestones],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <ImageBackground
        source={PATTERN}
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.03 }}
        resizeMode="repeat"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.78}
            style={styles.headerButton}
          >
            <ArrowLeft size={22} color={COLORS.textBase} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Insights</Text>
          <TouchableOpacity
            onPress={handleSettings}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            activeOpacity={0.78}
            style={styles.headerButton}
          >
            <Settings size={22} color={COLORS.textBase} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {TABS.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => selectTab(tab.key)}
                  activeOpacity={0.8}
                  style={[styles.tab, selected && styles.activeTab]}
                >
                  <Text style={[styles.tabText, selected && styles.activeTabText]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {statsLoading && !stats ? (
            <InsightsSkeleton />
          ) : (
            <View style={{ paddingHorizontal: 16, marginTop: 24, gap: 18 }}>
              <InsightsContentCard
                activeTab={activeTab}
                score={Number(stats?.enrichment_score) || 0}
                categoryScores={stats?.category_scores}
                insights={sanitizedInsights}
                notes={sanitizedNotes}
                preferences={sanitizedPreferences}
              />

            {/* Milestones & Achievements */}
            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: COLORS.strokeWeaker,
                overflow: 'hidden',
                shadowColor: COLORS.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 16,
                elevation: 2,
              }}
            >
              <ImageBackground
                source={STREAK_BG}
                style={{ width: '100%', padding: 20, gap: 16 }}
                resizeMode="cover"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: COLORS.brandSubtle,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 94, 0, 0.15)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Award size={18} color={COLORS.brand} strokeWidth={2.2} />
                    </View>
                    <Text style={{ ...TYPE.cardTitle, color: COLORS.textStrong }}>
                      Milestones & Streaks
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: COLORS.brandSubtle,
                      borderWidth: 1,
                      borderColor: 'rgba(255, 94, 0, 0.15)',
                    }}
                  >
                    <Text style={{ ...TYPE.bodyStrong, color: COLORS.brand }}>
                      {achievedCount} of {milestones.length}
                    </Text>
                  </View>
                </View>

                <View style={{ gap: 10 }}>
                  {milestones.map((milestone) => (
                    <View
                      key={milestone.id}
                      style={{
                        backgroundColor: milestone.achieved
                          ? 'rgba(6, 122, 87, 0.05)'
                          : 'rgba(255, 255, 255, 0.8)',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: milestone.achieved
                          ? 'rgba(6, 122, 87, 0.15)'
                          : COLORS.strokeWeaker,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            ...TYPE.bodyStrong,
                            color: COLORS.textStrong,
                          }}
                        >
                          {milestone.title}
                        </Text>
                        <Text
                          style={{
                            ...TYPE.metadata,
                            color: COLORS.textWeak,
                            lineHeight: 16,
                          }}
                        >
                          {milestone.description}
                        </Text>
                      </View>

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: milestone.achieved
                            ? 'rgba(6, 122, 87, 0.08)'
                            : COLORS.fillWeak,
                        }}
                      >
                        <Text
                          style={{
                            ...TYPE.metadata,
                            color: milestone.achieved ? COLORS.success : COLORS.textWeak,
                          }}
                        >
                          {milestone.progressLabel}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ImageBackground>
            </View>
          </View>
          )}
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  headerTitle: {
    position: 'absolute' as const,
    left: 76,
    right: 76,
    textAlign: 'center' as const,
    color: COLORS.textStrong,
    ...TYPE.screenTitle,
  },
  tabs: {
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 14,
  },
  tab: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: COLORS.textStrong,
    borderColor: COLORS.textStrong,
  },
  tabText: {
    color: COLORS.textStrong,
    ...TYPE.label,
  },
  activeTabText: {
    color: COLORS.textInverse,
  },
};
