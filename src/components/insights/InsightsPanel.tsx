import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { TYPE } from '@/constants/typography';
import { formatDayMonth, type Insight } from '@/features/insights/insights-model';
import { useInsightList } from '@/hooks/queries/use-insights';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { EnrichmentFieldIcon } from './EnrichmentFieldIcon';
import { INSIGHTS_RADIUS, InsightsMessage, InsightsPressable } from './InsightsPrimitives';

/** The icon is the field the insight leans toward most, which the API lists first. */
const InsightCard = React.memo(function InsightCard({
  insight,
  onOpen,
}: {
  insight: Insight;
  onOpen: (insight: Insight) => void;
}) {
  const colors = useThemeColors();
  const open = useCallback(() => onOpen(insight), [insight, onOpen]);
  return (
    <InsightsPressable
      onPress={open}
      accessibilityLabel={insight.title}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        padding: 16,
        borderRadius: INSIGHTS_RADIUS,
        backgroundColor: colors.fillWeak,
      }}
    >
      <EnrichmentFieldIcon field={insight.categories[0]} size={32} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[TYPE.bodyLarge, { color: colors.textStrong }]}>{insight.title}</Text>
        <Text style={[TYPE.bodySmall, { color: colors.textBase, marginTop: 8 }]} numberOfLines={2}>
          {insight.body}
        </Text>
      </View>
    </InsightsPressable>
  );
});

/** Web `insights-panel.tsx`: patterns Memento found across several memories. */
export function InsightsPanel({ onOpen }: { onOpen: (insight: Insight) => void }) {
  const colors = useThemeColors();
  const { data: list, error, isLoading, refetch } = useInsightList();

  if (error && !list) {
    return (
      <InsightsMessage
        body="Couldn’t load your insights."
        actionLabel="Retry insights"
        onAction={() => void refetch()}
      />
    );
  }
  if (isLoading && !list) return <InsightsMessage loading body="Loading your insights…" />;

  if (!list?.insights?.length) {
    const checked = Boolean(list?.generated_at);
    const nextLook = formatDayMonth(list?.next_refresh_at);
    return (
      <InsightsMessage
        loading={list?.generating}
        icon={<Sparkles size={32} color={colors.textWeak} />}
        title={
          list?.generating
            ? 'Looking across your memories…'
            : checked
              ? 'Nothing stands out yet'
              : 'Your insights are taking shape'
        }
        body={
          list?.generating
            ? 'This can take a moment.'
            : checked
              ? `Memento shares a pattern once it shows up across several of your memories over time.${nextLook ? ` It looks again around ${nextLook}.` : ''}`
              : 'Keep saving memories and reflecting. Memento shares a pattern once it shows up across several of them.'
        }
      />
    );
  }

  const nextLook = formatDayMonth(list.next_refresh_at);
  return (
    <View style={{ gap: 16 }}>
      {list.insights.map((insight) => (
        <InsightCard key={insight.id} insight={insight} onOpen={onOpen} />
      ))}
      {nextLook ? (
        <Text style={[TYPE.metadata, { color: colors.textWeak, textAlign: 'center', paddingTop: 8 }]}>
          {list.generating ? 'Looking for anything new.' : `Memento looks again around ${nextLook}.`}
        </Text>
      ) : null}
    </View>
  );
}
