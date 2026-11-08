import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Pressable } from '@/components/ui/Touchable';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { TYPE } from '@/constants/typography';
import { iconSize } from '@/constants/responsive';
import type { AccountWeekDay } from '@/features/account/account-overview';
import { ZapIconWarm } from '../ui';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WeeklyProgressCardProps {
  weekDays: AccountWeekDay[];
  streakCount: number;
  storiesCount: number;
  reflectionsCount: number;
  onPress: () => void;
}

/** Web `check-icon.tsx`. */
function CheckMark({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 10 7" fill="none">
      <Path d="M9 1L3.5 6.5L1 4" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function WeekCell({ day }: { day: AccountWeekDay }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.dayCell}>
      <Text style={[styles.dayLabel, day.isToday && styles.todayLabel]}>{day.label}</Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${day.fullDate ?? day.date}: ${day.isCompleted ? 'active' : 'no activity'}`}
        style={[
          styles.ring,
          day.isCompleted ? styles.ringActive : day.isToday ? styles.ringToday : styles.ringIdle,
        ]}
      >
        <View style={styles.ringInner}>
          {day.isCompleted ? <CheckMark color={colors.brand} /> : null}
        </View>
      </View>
    </View>
  );
}

/** Web streak card B (`streak-tracker.tsx`): weekly streak, Monday to Sunday, then reflections and stories. */
export const WeeklyProgressCard = React.memo(function WeeklyProgressCard({
  weekDays,
  streakCount,
  storiesCount,
  reflectionsCount,
  onPress,
}: WeeklyProgressCardProps) {
  const styles = useThemeStyles(createStyles);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const days = `${streakCount} ${streakCount === 1 ? 'day' : 'days'}`;

  return (
    <Animated.View entering={FadeInDown.delay(320).duration(500)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.card, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Weekly streak, ${days}. ${reflectionsCount} reflections, ${storiesCount} stories.`}
      >
        <View style={styles.titleRow}>
          <ZapIconWarm size={iconSize(20)} />
          <Text style={styles.title}>Weekly streak</Text>
        </View>

        <Text style={styles.count}>{days}</Text>

        <View style={styles.weekRow}>
          {weekDays.map((day) => <WeekCell key={day.key} day={day} />)}
        </View>

        <Text style={styles.totals}>
          <Text style={styles.totalValue}>{reflectionsCount}</Text>
          {` ${reflectionsCount === 1 ? 'reflection' : 'reflections'}     `}
          <Text style={styles.totalValue}>{storiesCount}</Text>
          {` ${storiesCount === 1 ? 'story' : 'stories'}`}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
});

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    backgroundColor: COLORS.fillWeak,
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: COLORS.textStrong,
    ...TYPE.buttonSmall,
  },
  count: {
    marginTop: 12,
    color: COLORS.textStrong,
    ...TYPE.streakCount,
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.strokeWeak,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    color: COLORS.textBase,
    ...TYPE.metadata,
  },
  todayLabel: {
    color: COLORS.brand,
  },
  ring: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringActive: {
    backgroundColor: COLORS.brand,
  },
  ringToday: {
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.brand,
  },
  ringIdle: {
    backgroundColor: COLORS.fillWeak,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
  },
  ringInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sheet,
  },
  totals: {
    marginTop: 12,
    color: COLORS.textBase,
    ...TYPE.bodySmall,
  },
  totalValue: {
    color: COLORS.textStrong,
    ...TYPE.bodySmallStrong,
  },
});
