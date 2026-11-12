import { Avatar } from "@/components/ui/Avatar";
import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Plus from 'lucide-react-native/icons/plus';
import { useUiStore } from '@/store';
import { usePersona, useMemoryInsightsSummary, useUserContext } from '@/hooks/queries/use-persona';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP, getSheetActionsBottomPadding } from '@/features/layout/sheet-safe-area';
import { SheetHeader } from './SheetHeader';

const EMPTY_EXPLORE = require('../../../assets/images/illustrations/empty_explore.webp');

const SUMMARY_TAB_KEY = 'summary';

const CATEGORIES = [
  { label: 'Summary', key: SUMMARY_TAB_KEY },
  { label: 'All', key: 'all' },
  { label: 'Preferences', key: 'key_preferences' },
  { label: 'Notes', key: 'important_notes' },
  { label: 'Goals', key: 'goals_and_aspirations' },
  { label: 'Emotions', key: 'emotional_state_trends' },
];

const INSIGHT_CATEGORY_LABELS: Record<string, string> = {
  important_notes: 'Note',
  key_preferences: 'Preference',
  goals_and_aspirations: 'Goal',
  emotional_state_trends: 'Emotion',
};

export function MemoryInsightsSheet() {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState(SUMMARY_TAB_KEY);
  const closeSheet = useUiStore((s) => s.closeSheet);
  const openSheet = useUiStore((s) => s.openSheet);

  const { data: persona, isLoading: personaLoading } = usePersona();
  const { data: summaryRes, isLoading: summaryLoading } = useMemoryInsightsSummary();
  const { data: beneficiariesData } = useBeneficiaries();
  const { data: context } = useUserContext();

  const beneficiaries = useMemo(() => {
    if (Array.isArray(beneficiariesData)) return beneficiariesData;
    if ((beneficiariesData as any)?.docs) return (beneficiariesData as any).docs;
    return [];
  }, [beneficiariesData]);

  const insightSource = useMemo(() => {
    const p = persona;
    if (p) {
      return {
        important_notes: p.important_notes,
        key_preferences: p.key_preferences,
        goals_and_aspirations: p.goals_and_aspirations,
        emotional_state_trends: p.emotional_state_trends,
      };
    }
    const c = context;
    return {
      important_notes: c?.important_notes,
      key_preferences: c?.key_preferences,
      goals_and_aspirations: c?.goals_and_aspirations,
      emotional_state_trends: c?.emotional_state_trends,
    };
  }, [persona, context]);

  const allInsights = useMemo(() => {
    const res: { text: string; category: string }[] = [];
    Object.keys(INSIGHT_CATEGORY_LABELS).forEach((cat) => {
      const items = (insightSource as any)[cat] || [];
      items.forEach((text: string) => res.push({ text, category: cat }));
    });
    return res;
  }, [insightSource]);

  const filtered = activeCategory === 'all'
    ? allInsights
    : allInsights.filter(i => i.category === activeCategory);

  const aiSummary = summaryRes?.summary?.trim() || null;

  return (
    <View className="px-5" style={{ flex: 1 }}>
      <SheetHeader title="Memory insights" onClose={closeSheet} closeLabel="Close insights" />

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: SHEET_SECTION_GAP, paddingTop: SHEET_GROUP_GAP, paddingBottom: getSheetActionsBottomPadding(insets.bottom) }}>
        {/* Beneficiaries section */}
        <View>
          <Text className="uppercase tracking-widest text-text-weak mb-3" style={TYPE.metadata}>
            Beneficiaries
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
            {beneficiaries.map((b: any) => (
              <View key={b._id} className="items-center gap-1.5 w-14">
                <Avatar uri={b.user?.picture_url} userId={b.user?._id} seed={b.user?.email || b.email} name={b.name} size="lg" />
                <Text className="text-text-strong text-center truncate w-full" style={TYPE.eyebrow}>
                  {b.name.split(' ')[0]}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => openSheet('add-beneficiary')}
              className="items-center gap-1.5 w-14"
            >
              <View className="size-12 rounded-full border-2 border-dashed border-stroke-weak items-center justify-center bg-white/50">
                <Plus size={18} color={COLORS.textWeak} />
              </View>
              <Text className="text-text-weak text-center" style={TYPE.eyebrow}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View className="h-[1px] bg-stroke-weaker" />

        {/* Categories Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              className={cn(
                'px-4 py-2 rounded-full border',
                activeCategory === cat.key
                  ? 'bg-brand border-brand'
                  : 'bg-fill-weaker border-stroke-weaker'
              )}
            >
              <Text
                className={activeCategory === cat.key ? 'text-white' : 'text-text-strong'}
                style={TYPE.metadata}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {activeCategory === SUMMARY_TAB_KEY ? (
          <View>
            {summaryLoading && <Spinner />}
            {aiSummary ? (
              <View className="bg-fill-weak rounded-2xl p-5 border border-stroke-weaker gap-4">
                <Text className="text-text-strong leading-relaxed" style={TYPE.label}>
                  {aiSummary}
                </Text>
                {summaryRes?.generated_at && (
                  <Text className="text-text-weak" style={TYPE.metadata}>
                    Last updated {new Date(summaryRes.generated_at).toLocaleString()}
                  </Text>
                )}
              </View>
            ) : !summaryLoading && (
              <View className="flex-col items-center justify-center rounded-2xl border border-stroke-weaker bg-fill-weak py-10 px-6">
                <Image
                  source={EMPTY_EXPLORE}
                  style={{ width: 64, height: 64, marginBottom: 12 }}
                  resizeMode="contain"
                />
                <Text className="text-text-strong text-center" style={TYPE.label}>
                  Insights are generating
                </Text>
                <Text className="text-text-weak text-center mt-2 leading-relaxed" style={TYPE.metadata}>
                  As you log more memories and chats, Memento's AI builds a deeper understanding of your preferences and legacy.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="gap-3">
            {personaLoading && !persona && !context ? (
              <View className="gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} className="flex-row items-start gap-3 bg-fill-weaker p-4 rounded-xl border border-stroke-weaker">
                    <Skeleton className="size-8 rounded-lg" />
                    <View className="flex-1 gap-2 mt-0.5">
                      <Skeleton className="h-4 w-full rounded-md" />
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                    </View>
                  </View>
                ))}
              </View>
            ) : filtered.length === 0 ? (
              <View className="py-12 items-center justify-center gap-3">
                <Image
                  source={EMPTY_EXPLORE}
                  style={{ width: 64, height: 64, marginBottom: 8 }}
                  resizeMode="contain"
                />
                <Text className="text-text-strong" style={TYPE.label}>No insights yet</Text>
                <Text className="text-text-weak text-center leading-relaxed max-w-[220px]" style={TYPE.metadata}>
                  Keep using Memento — your AI will learn more about you over time.
                </Text>
              </View>
            ) : (
              filtered.map((item, i) => {
                const categoryLabel = INSIGHT_CATEGORY_LABELS[item.category] || 'Insight';
                return (
                  <View key={i} className="flex-row items-start gap-3 bg-fill-weaker p-4 rounded-2xl border border-stroke-weaker">
                    <View className="size-2 rounded-full bg-brand mt-2 shrink-0" />
                    <View className="flex-1 gap-1">
                      <Text className="text-brand uppercase tracking-wider" style={TYPE.eyebrow}>
                        {categoryLabel}
                      </Text>
                      <Text className="text-text-strong leading-relaxed" style={TYPE.label}>
                        {item.text}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </BottomSheetScrollView>
    </View>
  );
}
