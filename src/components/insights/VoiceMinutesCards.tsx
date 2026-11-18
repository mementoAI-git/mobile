import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { formatVoiceMinutes, voiceMinutes } from '@/features/chat/voice-usage';
import { useVoiceUsage } from '@/hooks/queries/use-voice-usage';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { INSIGHTS_RADIUS } from './InsightsPrimitives';

function resetLabel(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Voice mode minutes, top of the Milestones tab: this month (starts over at
 * midnight on the 1st, local time) and all time. On the free plan the monthly
 * card also shows the 90-minute allowance, a bar and what is left.
 */
export function VoiceMinutesCards() {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const { data: usage, isLoading } = useVoiceUsage();
  if (!usage && !isLoading) return null;

  const month = usage ? formatVoiceMinutes(usage.monthSeconds) : '—';
  const allTime = usage ? formatVoiceMinutes(usage.allTimeSeconds) : '—';
  const resets = resetLabel(usage?.monthResetsAt ?? null);
  const free = usage?.freeLimitSeconds ? usage : null;
  const progress = free ? Math.min(1, free.monthSeconds / (free.freeLimitSeconds as number)) : 0;
  const leftMinutes = free ? voiceMinutes(free.freeLeftSeconds ?? 0) : 0;
  const usedUp = Boolean(free) && leftMinutes === 0;

  const monthDetail = free
    ? `${usedUp ? 'All' : leftMinutes} of ${voiceMinutes(free.freeLimitSeconds as number)} free min ${usedUp ? 'used' : 'left'}`
    : null;

  return (
    <View style={styles.row}>
      <View
        accessible
        accessibilityLabel={[
          `Voice mode this month: ${month}.`,
          monthDetail ? `${monthDetail}.` : '',
          resets ? `Starts over ${resets}.` : '',
        ].join(' ').trim()}
        style={styles.card}
      >
        <View style={styles.labelRow}>
          <AudioLines size={16} color={colors.brand} />
          <Text style={styles.label}>This month</Text>
        </View>
        <Text style={styles.value}>{month}</Text>
        {free ? (
          <>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: usedUp ? colors.warning : colors.brand },
                ]}
              />
            </View>
            <Text style={styles.detail}>{monthDetail}</Text>
          </>
        ) : null}
        {resets ? <Text style={styles.detail}>Starts over {resets}</Text> : null}
      </View>

      <View accessible accessibilityLabel={`Voice mode all time: ${allTime}.`} style={styles.card}>
        <View style={styles.labelRow}>
          <AudioLines size={16} color={colors.brand} />
          <Text style={styles.label}>All time</Text>
        </View>
        <Text style={styles.value}>{allTime}</Text>
        <Text style={styles.detail}>of voice mode</Text>
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: INSIGHTS_RADIUS,
    backgroundColor: c.fillWeak,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...TYPE.bodySmall,
    color: c.textBase,
  },
  value: {
    ...TYPE.insightStat,
    color: c.textStrong,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: c.strokeWeak,
    marginTop: 4,
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  detail: {
    ...TYPE.bodySmall,
    color: c.textWeak,
  },
});
