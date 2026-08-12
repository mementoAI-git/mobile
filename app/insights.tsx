import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  InsightsContentCard,
  type InsightsTab,
} from '@/components/account/InsightsContentCard';
import { COLORS, FONTS } from '@/constants/tokens';
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

          <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
            <InsightsContentCard
              activeTab={activeTab}
              score={Number(stats?.enrichment_score) || 0}
              categoryScores={stats?.category_scores}
              insights={insights}
              notes={notes}
              preferences={preferences}
            />
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
