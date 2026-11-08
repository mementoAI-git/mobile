import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Undo2 from 'lucide-react-native/icons/undo-2';
import ArrowUpDown from 'lucide-react-native/icons/arrow-up-down';
import { Button } from '@/components/ui';
import type { EnrichmentCategory } from '@/constants/enrichment';
import { TYPE } from '@/constants/typography';
import { getQuestionIdenticonUrl } from '@/features/explore/question-presentation';
import {
  NO_OBSERVATION_SOURCES,
  SOURCE_ORDER_LABELS,
  enrichmentFieldColor,
  fieldSourcesUrl,
  formatSourceDate,
  getEnrichmentField,
  insightSourcesUrl,
  observationSourcesUrl,
  sortSources,
  withAlpha,
  type Insight,
  type InsightSource,
  type ObservationItem,
  type SourceOrder,
} from '@/features/insights/insights-model';
import { useInsightSources } from '@/hooks/queries/use-insights';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { EnrichmentFieldIcon, useFieldColorsDark } from './EnrichmentFieldIcon';
import {
  INSIGHT_NOTE_FILL,
  INSIGHTS_RADIUS,
  InsightsMessage,
  InsightsPressable,
} from './InsightsPrimitives';

/** Sets the last word of a heading in the serif italic, like the web page title. */
function FieldHeading({ label }: { label: string }) {
  const colors = useThemeColors();
  const split = label.lastIndexOf(' ');
  return (
    <Text accessibilityRole="header" style={[TYPE.screenTitle, { color: colors.textStrong, flex: 1 }]}>
      {split < 0 ? null : `${label.slice(0, split)} `}
      <Text style={TYPE.screenTitleAccent}>{split < 0 ? label : label.slice(split + 1)}</Text>
    </Text>
  );
}

const SourceRow = React.memo(function SourceRow({
  source,
  first,
  onView,
}: {
  source: InsightSource;
  first: boolean;
  onView: (source: InsightSource) => void;
}) {
  const colors = useThemeColors();
  const view = useCallback(() => onView(source), [onView, source]);
  return (
    <InsightsPressable
      onPress={view}
      accessibilityLabel={`View ${source.title}`}
      style={{
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.strokeWeak,
      }}
    >
      <Image
        source={{ uri: source.thumbnail || getQuestionIdenticonUrl(source.id) }}
        style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.strokeWeak }}
        contentFit="cover"
        accessibilityElementsHidden
      />
      <Text style={[TYPE.label, { color: colors.textStrong, flex: 1 }]} numberOfLines={1}>
        {source.title}
      </Text>
      <Text style={[TYPE.bodySmall, { color: colors.textBase }]}>{formatSourceDate(source.created_at)}</Text>
    </InsightsPressable>
  );
});

function SourcesList({
  url,
  empty,
  onView,
}: {
  url: string;
  empty: string;
  onView: (source: InsightSource) => void;
}) {
  const colors = useThemeColors();
  const [order, setOrder] = useState<SourceOrder>('newest');
  const { data, error, isLoading, refetch } = useInsightSources(url);
  const all = data ?? [];
  const sources = useMemo(() => sortSources(data ?? [], order), [data, order]);
  const toggleOrder = useCallback(() => setOrder((current) => (current === 'newest' ? 'oldest' : 'newest')), []);

  if (error && !data) {
    return (
      <InsightsMessage
        body="Couldn’t load these memories."
        actionLabel="Retry memories"
        onAction={() => void refetch()}
      />
    );
  }
  if (isLoading && !data) return <InsightsMessage loading body="Loading memories…" />;

  return (
    <View accessibilityLabel="Memory sources" style={{ gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={[TYPE.bodyStrong, { color: colors.textStrong }]}>
          {all.length} Memory {all.length === 1 ? 'source' : 'sources'}
        </Text>
        <Button
          variant="outline"
          size="sm"
          onPress={toggleOrder}
          accessibilityLabel={`Sort memory sources, ${SOURCE_ORDER_LABELS[order]}`}
          rightIcon={<ArrowUpDown size={14} color={colors.textStrong} />}
        >
          {SOURCE_ORDER_LABELS[order]}
        </Button>
      </View>
      {!sources.length ? (
        <InsightsMessage body={empty} />
      ) : (
        <View
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.strokeWeak,
            borderRadius: INSIGHTS_RADIUS,
            backgroundColor: colors.fillWeak,
          }}
        >
          {sources.map((source, index) => (
            // A chat appears once for each day that supports the insight.
            <SourceRow key={`${source.id}-${source.created_at}`} source={source} first={index === 0} onView={onView} />
          ))}
        </View>
      )}
    </View>
  );
}

function DetailFrame({
  categories,
  subtitle,
  note,
  onBack,
  action,
  children,
}: {
  categories: EnrichmentCategory[];
  subtitle: string;
  note: React.ReactNode;
  onBack: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  const dark = useFieldColorsDark();
  const field = categories[0] ? getEnrichmentField(categories[0]) : undefined;
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Button
          iconOnly
          variant="secondary"
          rounded="full"
          onPress={onBack}
          accessibilityLabel="Back to insights"
          style={{ width: 44, height: 44, minHeight: 44, paddingHorizontal: 0 }}
        >
          <Undo2 size={20} color={colors.textStrong} />
        </Button>
        <FieldHeading label={field?.label ?? 'Insight'} />
      </View>
      <View
        style={{
          gap: 16,
          borderRadius: INSIGHTS_RADIUS,
          padding: 16,
          backgroundColor: withAlpha(enrichmentFieldColor(categories[0], dark), 0.12),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <EnrichmentFieldIcon field={categories[0]} size={40} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[TYPE.uiTitle, { color: colors.textStrong }]}>{field?.label}</Text>
            <Text style={[TYPE.bodySmall, { color: colors.textBase, marginTop: 4 }]}>{subtitle}</Text>
          </View>
        </View>
        {action}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderRadius: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: INSIGHT_NOTE_FILL,
        }}
      >
        <Sparkles size={22} color={colors.warning} fill={colors.warning} />
        <View style={{ flex: 1, minWidth: 0 }}>{note}</View>
      </View>
      <View style={{ marginTop: 24, gap: 24 }}>{children}</View>
    </Animated.View>
  );
}

function NoteText({ title, detail }: { title: string; detail?: string }) {
  const colors = useThemeColors();
  return (
    <>
      <Text style={[TYPE.bodySmall, { color: colors.textStrong }]}>{title}</Text>
      {detail ? <Text style={[TYPE.bodySmall, { color: colors.textBase, marginTop: 4 }]}>{detail}</Text> : null}
    </>
  );
}

export function InsightDetail({
  insight,
  onBack,
  onView,
}: {
  insight: Insight;
  onBack: () => void;
  onView: (source: InsightSource) => void;
}) {
  return (
    <DetailFrame
      categories={insight.categories}
      subtitle="Memories that helped shape this insight"
      onBack={onBack}
      note={<NoteText title={insight.title} detail={insight.body} />}
    >
      <SourcesList
        url={insightSourcesUrl(insight.id)}
        empty="The memories behind this insight are no longer available."
        onView={onView}
      />
    </DetailFrame>
  );
}

/** One observation or preference and the memories it came from. */
export function ObservationDetail({
  item,
  onBack,
  onView,
}: {
  item: ObservationItem;
  onBack: () => void;
  onView: (source: InsightSource) => void;
}) {
  return (
    <DetailFrame
      categories={[item.category]}
      subtitle="Memories behind this note"
      onBack={onBack}
      note={<NoteText title={item.title} detail={item.detail} />}
    >
      <SourcesList url={observationSourcesUrl(item.id)} empty={NO_OBSERVATION_SOURCES} onView={onView} />
    </DetailFrame>
  );
}

/** One enrichment field and every memory tagged with it. */
export function EnrichmentFieldDetail({
  field,
  onBack,
  onView,
  onReflect,
}: {
  field: EnrichmentCategory;
  onBack: () => void;
  onView: (source: InsightSource) => void;
  onReflect: (field: EnrichmentCategory) => void;
}) {
  return (
    <DetailFrame
      categories={[field]}
      subtitle="Memories that shape this field"
      onBack={onBack}
      note={<NoteText title={getEnrichmentField(field).description} />}
      action={
        <Button variant="outline" size="md" onPress={() => onReflect(field)}>
          Reflect on this
        </Button>
      }
    >
      <SourcesList
        url={fieldSourcesUrl(field)}
        empty="No memories here yet. Reflect on this field to start filling it in."
        onView={onView}
      />
    </DetailFrame>
  );
}
