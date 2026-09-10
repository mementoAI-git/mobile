import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useUserStore } from '@/store';
import { useUserStats } from '@/hooks/queries/use-overview';

import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { ZapIconWarm } from '@/components/ui';
import { toMondayFirstIndex } from '@/features/account/account-overview';
import { CompletedCheckmarkIcon } from '../ui/icons/CompletedCheckmarkIcon';

const STREAK_FLAME = require('../../../assets/images/illustrations/streak_flame.webp');

// The open-arc SVG path (horseshoe open at bottom) from design assets.
// Total dash ceiling = 350 (slightly above the ~310 real arc length).
const ARC_PATH = 'M31.091 106.753C12.8665 97.4489 0.387861 78.497 0.387862 56.6305C0.387864 25.5686 25.5685 0.387936 56.6305 0.387937C87.6924 0.387938 112.873 25.5686 112.873 56.6305C112.873 78.497 100.394 97.4489 82.1699 106.753';
const ARC_DASH = 350;

const AnimatedPath = Animated.createAnimatedComponent(Path);

function getStreakSubtitle(days: number, nickname?: string): string {
  const name = nickname ? `, ${nickname}` : '';
  if (days >= 21) return `You are a legend${name}. Keep it up!`;
  if (days >= 8) return `You are on a roll${name}. Keep it up!`;
  if (days === 7) return `A full week${name}. Your story is taking shape!`;
  if (days >= 3) return `Great rhythm${name}. Keep it up!`;
  if (days === 1) return `Great start${name}. Come back tomorrow!`;
  return `Every story starts somewhere${name}. You've got this!`;
}

// Week starts Monday: M T W T F S S
// Index 0 = Monday, 6 = Sunday
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ── Animated arc ring ───────────────────────────────────────────────────────
// Draws the horseshoe ring that surrounds the flame on mount.
// size: rendered pixel size of the SVG (should match the circle container size).
function StreakArc({ size = 120 }: { size?: number }) {
  const dashOffset = useSharedValue(ARC_DASH);

  useEffect(() => {
    dashOffset.value = withTiming(0, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 114 108"
      fill="none"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <AnimatedPath
        d={ARC_PATH}
        stroke="#78C6FC"
        strokeWidth={0.77576}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={ARC_DASH}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

export function StreakSheet() {
  const user = useUserStore((s) => s.user);
  const { data: statsData } = useUserStats();
  const stats = statsData ?? {} as any;

  const streakCount = Number(user?.streak) || Number(stats.streak_count) || 0;
  const today = new Date();
  const todayMonFirst = toMondayFirstIndex(today.getDay()); // 0 = Mon … 6 = Sun
  const nickname = user?.nickname || user?.first_name || '';

  // Streak days go backwards from today in Mon-first space.
  const streakStart = Math.max(0, todayMonFirst - (streakCount - 1));

  const CIRCLE_SIZE = 120;

  return (
    <BottomSheetView style={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* ── Animated arc + flame + overlapping day count ─────────── */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={{ alignItems: 'center' }} className="relative">
          {/* Outer container — arc SVG is absolutely positioned inside */}
          <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <StreakArc size={CIRCLE_SIZE} />
            <Image source={STREAK_FLAME} style={{ width: 72, height: 72 }} resizeMode="contain" />
          </View>
          {/* Number overlaps the bottom of the arc ring */}
          <Text style={{
            ...TYPE.displayStat,
            color: COLORS.textStrong,
            lineHeight: 56,
            marginTop: -24,
            position: 'absolute',
            bottom: -24,
          }}>
            {streakCount}
          </Text>
        </View>
      </View>

      {/* ── Title + subtitle ────────────────────────────────────── */}
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 32, paddingHorizontal: 24 }}>
        <Text style={{ ...TYPE.sectionTitle, color: COLORS.textStrong, textAlign: 'center' }}>
          {streakCount === 1 ? 'Day' : 'Days'} streak
        </Text>
        <Text style={{ ...TYPE.label, color: COLORS.textWeak, textAlign: 'center', lineHeight: 20 }}>
          {getStreakSubtitle(streakCount, nickname)}
        </Text>
      </View>

      {/* ── Week calendar (Mon–Sun) ──────────────────────────────── */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 28, paddingHorizontal: 16 }}>
        {WEEK_LABELS.map((label, index) => {
          const isToday = index === todayMonFirst;
          const isPastStreak = streakCount > 0 && index < todayMonFirst && index >= streakStart;
          // Offset from today in Mon-first space
          const diff = index - todayMonFirst;
          const d = new Date(today);
          d.setDate(today.getDate() + diff);
          const dateNum = d.getDate();

          return (
            <View key={index} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Text style={{
                ...TYPE.metadata,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: isToday ? COLORS.brand : COLORS.textMuted,
              }}>
                {isToday ? 'TODAY' : label}
              </Text>

              {isPastStreak ? (
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#22C55E',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CompletedCheckmarkIcon containerSize={22}/>
                </View>
              ) : isToday ? (
                // TODAY: ZapIconWarm on top, bold orange date below — no border ring
                <View style={{ alignItems: 'center', height: 36, justifyContent: 'center', flexDirection: 'row', gap: 4  }}>
                  <ZapIconWarm size={16} />
                  <Text style={{ ...TYPE.bodySmall, color: COLORS.brand, lineHeight: 16 }}>
                    {dateNum}
                  </Text>
                </View>
              ) : (
                <View style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ ...TYPE.body, color: COLORS.textWeak }}>
                    {dateNum}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── Bottom stats card ───────────────────────────────────── */}
      <View style={{ marginHorizontal: 16 }}>
        <View style={{
          backgroundColor: COLORS.fillWeaker,
          borderRadius: 20,
          paddingTop: 14,
          paddingBottom: 4,
          paddingHorizontal: 4,
          borderWidth: 1,
          borderColor: COLORS.strokeWeaker,
        }}>
          <Text style={{
            ...TYPE.bodySmall,
            color: COLORS.textStrong,
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Your Reflection Habit
          </Text>
          <View style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            flexDirection: 'row',
            overflow: 'hidden',
          }}>
            {[
              { label: 'Day Streak', value: stats.streak_count || user?.streak || 0 },
              { label: 'Reflections', value: stats.reflections_count || 0 },
              { label: 'Stories', value: stats.stories_count || 0 },
            ].map((item, i) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  paddingVertical: 18,
                  alignItems: 'center',
                  gap: 4,
                  borderRightWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
                  borderRightColor: COLORS.strokeWeaker,
                }}
              >
                <Text style={{ ...TYPE.metadata, color: COLORS.textWeak }}>
                  {item.label}
                </Text>
                <Text style={{ ...TYPE.uiTitle, color: COLORS.textStrong }}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={{
          ...TYPE.metadata,
          color: COLORS.textMuted,
          textAlign: 'center',
          marginTop: 10,
          paddingHorizontal: 12,
          lineHeight: 16,
        }}>
          Reflect daily to keep your memory archive alive and unlock deeper life insights.
        </Text>
      </View>
    </BottomSheetView>
  );
}
