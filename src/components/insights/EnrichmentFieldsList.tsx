import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import type { EnrichmentCategory } from '@/constants/enrichment';
import { TYPE } from '@/constants/typography';
import {
  ENRICHMENT_FIELDS,
  enrichmentFieldColor,
  type EnrichmentField,
} from '@/features/insights/insights-model';
import { useUserStats } from '@/hooks/queries/use-overview';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { EnrichmentFieldIcon, useFieldColorsDark } from './EnrichmentFieldIcon';
import { INSIGHTS_RADIUS } from './InsightsPrimitives';

type CategoryScore = { key: EnrichmentCategory; score?: number; unlocked?: boolean };

const FieldRow = React.memo(function FieldRow({
  field,
  score,
  first,
  onExplore,
}: {
  field: EnrichmentField;
  score: CategoryScore | undefined;
  first: boolean;
  onExplore: (field: EnrichmentCategory) => void;
}) {
  const colors = useThemeColors();
  const dark = useFieldColorsDark();
  const value = Math.round(Math.min(100, Math.max(0, Number(score?.score) || 0)));
  const explore = useCallback(() => onExplore(field.key), [field.key, onExplore]);
  return (
    <View
      style={{
        padding: 14,
        gap: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.strokeWeak,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <EnrichmentFieldIcon field={field.key} size={36} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[TYPE.label, { color: colors.textStrong }]} numberOfLines={1}>
            {field.label}
          </Text>
          <Text style={[TYPE.metadata, { color: colors.textBase, marginTop: 2 }]} numberOfLines={1}>
            {field.description}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {score?.unlocked === false ? (
          <Text style={[TYPE.metadata, { color: colors.textWeak, flex: 1 }]}>Unlocks soon</Text>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={[TYPE.label, { color: colors.textStrong, minWidth: 40, fontVariant: ['tabular-nums'] }]}>
              {value}%
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={`${field.label} score`}
              accessibilityValue={{ min: 0, max: 100, now: value }}
              style={{ flex: 1, height: 3, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.strokeWeak }}
            >
              <View
                style={{
                  width: `${value}%`,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: enrichmentFieldColor(field.key, dark),
                }}
              />
            </View>
          </View>
        )}
        <Button
          variant="outline"
          size="sm"
          onPress={explore}
          accessibilityLabel={`Explore ${field.label}`}
        >
          Explore
        </Button>
      </View>
    </View>
  );
});

/** Web `enrichment-fields-table.tsx`, stacked the way web lays it out on phones. */
export function EnrichmentFieldsList({ onExplore }: { onExplore: (field: EnrichmentCategory) => void }) {
  const colors = useThemeColors();
  const { data: stats } = useUserStats();
  const scores = useMemo(
    () => new Map(((stats?.category_scores ?? []) as CategoryScore[]).map((score) => [score.key, score])),
    [stats?.category_scores],
  );
  return (
    <View
      accessibilityLabel="Enrichment fields"
      style={{
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.strokeWeak,
        borderRadius: INSIGHTS_RADIUS,
        backgroundColor: colors.fillWeak,
      }}
    >
      {ENRICHMENT_FIELDS.map((field, index) => (
        <FieldRow
          key={field.key}
          field={field}
          score={scores.get(field.key)}
          first={index === 0}
          onExplore={onExplore}
        />
      ))}
    </View>
  );
}
