import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings, Award, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  InsightsContentCard,
  type InsightsTab,
} from '@/components/account/InsightsContentCard';
import { COLORS, FONTS } from '@/constants/tokens';
import { calculateMilestones } from '@/features/insights/milestone-celebrations';
import { useProfile } from '@/hooks/queries/use-profile';
import { useUserStats } from '@/hooks/queries/use-overview';
import {
  usePersona,
  useUserContext,
} from '@/hooks/queries/use-persona';

const PATTERN = require('../assets/images/backgrounds/welcome_bg.png');

const TABS: { key: InsightsTab; label: string }[] = [
  { key: 'enrichment', label: 'Enrichment score' },
  { key: 'insights', label: 'Insights' },
  { key: 'notes', label: 'Notes' },
  { key: 'preferences', label: 'Preferences' },
];

export default function InsightsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<InsightsTab>('enrichment');
  const { data: profile } = useProfile();
  const { data: stats } = useUserStats();
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
  const biography = profile?.context?.self_description?.trim()
    || insightSource?.self_description?.trim()
    || null;

  const userName = profile?.nickname || profile?.first_name || 'You';

  const sanitizeText = useCallback((text: string) => {
    if (!text) return '';
    return text
      .replace(/\bThe user\b/g, userName)
      .replace(/\bthe user\b/g, userName);
  }, [userName]);

  const sanitizedInsights = useMemo(() => {
    return insights.map(sanitizeText);
  }, [insights, sanitizeText]);

  const sanitizedNotes = useMemo(() => {
    return notes.slice(0, 4).map((note: string) => sanitizeText(note));
  }, [notes, sanitizeText]);

  const sanitizedPreferences = useMemo(() => {
    return preferences.map(sanitizeText);
  }, [preferences, sanitizeText]);

  const milestones = useMemo(() => {
    return calculateMilestones({
      memoryCount: stats?.memories_count,
      streakDays: stats?.streak_days,
      capsuleCount: stats?.capsules_count,
      enrichmentScore: Number(stats?.enrichment_score) || 0,
      beneficiaryCount: stats?.beneficiaries_count,
    });
  }, [stats]);


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
          {/* {biography && <Text style={styles.biography}>{biography}</Text>} */}

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

          <View style={{ paddingHorizontal: 16, marginTop: 28, gap: 20 }}>
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
                borderColor: COLORS.strokeWeak,
                padding: 20,
                gap: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Award size={18} color={COLORS.brand} />
                  <Text style={{ fontFamily: FONTS.serif, fontSize: 18, color: COLORS.textStrong }}>
                    Milestones & Streaks
                  </Text>
                </View>
                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 12, color: COLORS.brand }}>
                  {milestones.filter((m) => m.achieved).length} of {milestones.length}
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                {milestones.map((milestone) => (
                  <View
                    key={milestone.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: milestone.achieved ? COLORS.strokeWeak : COLORS.strokeWeaker,
                      backgroundColor: milestone.achieved ? 'rgba(6, 122, 87, 0.04)' : COLORS.fillWeaker,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text
                        style={{
                          fontFamily: FONTS.sansBold,
                          fontSize: 14,
                          color: milestone.achieved ? COLORS.textStrong : COLORS.textWeak,
                        }}
                      >
                        {milestone.title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: FONTS.sans,
                          fontSize: 12,
                          color: COLORS.textWeak,
                          marginTop: 2,
                        }}
                      >
                        {milestone.description}
                      </Text>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 12,
                        backgroundColor: milestone.achieved ? 'rgba(6, 122, 87, 0.1)' : COLORS.fillWeak,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {milestone.achieved ? (
                        <CheckCircle2 size={12} color={COLORS.success} />
                      ) : null}
                      <Text
                        style={{
                          fontFamily: FONTS.sansSemi,
                          fontSize: 11,
                          color: milestone.achieved ? COLORS.success : COLORS.textWeak,
                        }}
                      >
                        {milestone.progressLabel}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
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
    backgroundColor: COLORS.fillWeak,
  },
  headerTitle: {
    position: 'absolute' as const,
    left: 76,
    right: 76,
    textAlign: 'center' as const,
    color: COLORS.textStrong,
    fontFamily: FONTS.serif,
    fontSize: 22,
    lineHeight: 28,
  },
  biography: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sans,
    fontSize: 15,
    lineHeight: 21,
    marginHorizontal: 16,
    marginTop: 28,
  },
  tabs: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 14,
  },
  tab: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.fillWeak,
  },
  activeTab: {
    backgroundColor: COLORS.textStrong,
  },
  tabText: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
  },
  activeTabText: {
    color: COLORS.textInverse,
  },
};
