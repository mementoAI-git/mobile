import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import type { AccountWeekDay } from '@/features/account/account-overview';
import { ZapIconWarm } from '../ui';
import { CompletedCheckmarkIcon } from '../ui/icons/CompletedCheckmarkIcon';
const STREAK_FLAME = require('../../../assets/images/illustrations/streak_flame.webp');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WeeklyProgressCardProps {
  weekDays: AccountWeekDay[];
  streakCount: number;
  storiesCount: number;
  reflectionsCount: number;
  onPress: () => void;
}

function WeekCell({ day }: { day: AccountWeekDay }) {
  return (
    <View style={styles.dayCell}>
      <Text style={[styles.dayLabel, day.isToday && styles.todayLabel]}>
        {day.isToday ? 'TODAY' : day.label}
      </Text>
      {day.isCompleted ? (
        <View style={styles.completedCircle}>
          <CompletedCheckmarkIcon containerSize={22} />
        </View>
      ) : day.isToday ? (
        <View style={styles.todayValue}>
          {/* <Zap size={17} color={COLORS.brand} fill={COLORS.brand} /> */}
          <ZapIconWarm size={16} />
          <Text style={styles.todayDate}>{day.date}</Text>
        </View>
      ) : (
        <View style={styles.dateCircle}>
          <Text style={styles.dateText}>{day.date}</Text>
        </View>
      )}
    </View>
  );
}

export const WeeklyProgressCard = React.memo(function WeeklyProgressCard({
  weekDays,
  streakCount,
  storiesCount,
  reflectionsCount,
  onPress,
}: WeeklyProgressCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(320).duration(500)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.card, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Weekly progress. ${streakCount} day streak, ${storiesCount} stories, ${reflectionsCount} reflections.`}
      >
        <View style={styles.titleRow}>
          {/* <Flame size={22} color={COLORS.brand} fill={COLORS.brand} /> */}
          <Image source={STREAK_FLAME} style={{ width: 22, height: 22 }} resizeMode="contain" />
          <Text style={styles.title}>Weekly Progress</Text>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((day) => <WeekCell key={day.key} day={day} />)}
        </View>

        <View style={styles.statsRow}>
          {[
            { label: 'Streak', value: `${streakCount} days` },
            { label: 'Stories', value: `${storiesCount} captured` },
            { label: 'Reflections', value: `${reflectionsCount} engaged` },
          ].map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: 180,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundInverse,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  title: {
    color: COLORS.textInverse,
    ...TYPE.bodyLarge,
    lineHeight: 20,
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    color: COLORS.textInverse,
    opacity: 0.72,
    ...TYPE.metadata,
    lineHeight: 14,
  },
  todayLabel: {
    color: COLORS.brand,
    opacity: 1,
    ...TYPE.eyebrow,
  },
  completedCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
  },
  todayValue: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  todayDate: {
    color: COLORS.brand,
    ...TYPE.body,
  },
  dateCircle: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    color: COLORS.textInverse,
    opacity: 0.76,
    ...TYPE.label,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    color: COLORS.textInverse,
    opacity: 0.56,
    ...TYPE.metadata,
  },
  statValue: {
    color: COLORS.textInverse,
    ...TYPE.bodySmall,
  },
});
