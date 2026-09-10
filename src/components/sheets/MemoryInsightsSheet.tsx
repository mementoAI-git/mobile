import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Sparkles, Target, Heart, ListChecks, UserRound, Plus } from 'lucide-react-native';
import { useUiStore } from '@/store';
import { usePersona, useMemoryInsightsSummary, useUserContext } from '@/hooks/queries/use-persona';
import { useBeneficiaries } from '@/hooks/queries/use-beneficiaries';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

const SUMMARY_TAB_KEY = 'summary';

const CATEGORIES = [
  { label: 'Summary', key: SUMMARY_TAB_KEY },
  { label: 'All', key: 'all' },
  { label: 'Preferences', key: 'key_preferences' },
  { label: 'Notes', key: 'important_notes' },
  { label: 'Goals', key: 'goals_and_aspirations' },
  { label: 'Emotions', key: 'emotional_state_trends' },
];

const INSIGHT_ICONS: Record<string, any> = {
  important_notes: ListChecks,
  key_preferences: UserRound,
  goals_and_aspirations: Target,
  emotional_state_trends: Heart,
};

export function MemoryInsightsSheet() {
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
    Object.keys(INSIGHT_ICONS).forEach((cat) => {
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
    <View className="px-5 pt-2" style={{ flex: 1 }}>
      <View className="flex-row items-center justify-between mb-4 border-b border-stroke-weaker pb-3">
        <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Memory Insights
        </Text>
      </View>

      <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingBottom: 48 }}>
        {/* Beneficiaries section */}
        <View>
          <Text className="uppercase tracking-widest text-text-weak mb-3" style={TYPE.metadata}>
            Beneficiaries
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-4">
            {beneficiaries.map((b: any) => (
              <View key={b._id} className="items-center gap-1.5 w-14">
                <View className="size-12 rounded-full bg-fill-weak items-center justify-center overflow-hidden">
                  {b.user?.picture_url ? (
                    <Image source={{ uri: b.user.picture_url }} className="size-full" />
                  ) : (
                    <Text className="text-sm font-semibold text-text-strong" style={{ fontFamily: FONTS.sansBold }}>{b.name[0]}</Text>
                  )}
                </View>
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
                className={cn('text-xs font-medium', activeCategory === cat.key ? 'text-white' : 'text-text-strong')}
                style={{ fontFamily: FONTS.sansMedium }}
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
                <Text className="text-sm text-text-strong leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                  {aiSummary}
                </Text>
                {summaryRes?.generated_at && (
                  <Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sans }}>
                    Last updated {new Date(summaryRes.generated_at).toLocaleString()}
                  </Text>
                )}
              </View>
            ) : !summaryLoading && (
              <View className="flex-col items-center justify-center rounded-2xl border border-stroke-weaker bg-fill-weak py-10 px-6">
                <View className="size-12 rounded-full bg-white flex items-center justify-center mb-3">
                  <Sparkles size={20} color={COLORS.textWeak} />
                </View>
                <Text className="text-sm font-medium text-text-strong text-center" style={{ fontFamily: FONTS.sansMedium }}>
                  Insights are generating
                </Text>
                <Text className="text-xs text-text-weak text-center mt-2 leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                  As you log more memories and chats, Memento's AI builds a deeper understanding of your preferences and legacy.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="gap-3">
            {filtered.length === 0 ? (
              <View className="py-12 items-center justify-center gap-3">
                <View className="size-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Sparkles size={20} color={COLORS.textWeak} />
                </View>
                <Text className="text-sm font-medium text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>No insights yet</Text>
                <Text className="text-xs text-text-weak text-center leading-relaxed max-w-[220px]" style={{ fontFamily: FONTS.sans }}>
                  Keep using Memento — your AI will learn more about you over time.
                </Text>
              </View>
            ) : (
              filtered.map((item, i) => {
                const Icon = INSIGHT_ICONS[item.category] || Sparkles;
                return (
                  <View key={i} className="flex-row items-start gap-3 bg-fill-weaker p-4 rounded-xl border border-stroke-weaker">
                    <View className="size-8 rounded-lg bg-white items-center justify-center mt-0.5">
                      <Icon size={16} color={COLORS.brand} />
                    </View>
                    <Text className="flex-1 text-sm text-text-strong leading-relaxed" style={{ fontFamily: FONTS.sans }}>
                      {item.text}
                    </Text>
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
