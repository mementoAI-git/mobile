import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import { useUserStore } from '@/store';
import { useUserStats } from '@/hooks/queries/use-overview';
import { COLORS, FONTS } from '@/constants/tokens';
import { ZapIconWarm } from '@/components/ui';

const STREAK_FLAME = require('../../../assets/images/illustrations/streak_flame.webp');

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

// Maps JS getDay() (0=Sun … 6=Sat) → our Mon-first index (0=Mon … 6=Sun)
function toMonFirstIndex(jsDow: number): number {
  return (jsDow + 6) % 7;
}

export function StreakSheet() {
  const user = useUserStore((s) => s.user);
  const { data: statsData } = useUserStats();
  const stats = statsData ?? {} as any;

  const streakCount = Number(user?.streak) || Number(stats.streak_count) || 0;
  const today = new Date();
  const todayMonFirst = toMonFirstIndex(today.getDay()); // 0 = Mon … 6 = Sun
  const nickname = user?.nickname || user?.first_name || '';

  // Streak days go backwards from today in Mon-first space.
  const streakStart = Math.max(0, todayMonFirst - (streakCount - 1));

  return (
    <BottomSheetView style={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* ── Flame circle with overlapping day count ───────────────── */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 2,
            borderColor: '#93C5FD',
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Image source={STREAK_FLAME} style={{ width: 72, height: 72 }} resizeMode="contain" />
          </View>
          {/* Number overlaps the bottom of the circle */}
          <Text style={{
            fontFamily: FONTS.serif,
            fontSize: 52,
            color: COLORS.textStrong,
            lineHeight: 56,
            marginTop: -18,
          }}>
            {streakCount}
          </Text>
        </View>
      </View>

      {/* ── Title + subtitle ────────────────────────────────────── */}
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 32, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: FONTS.serif, fontSize: 26, color: COLORS.textStrong, textAlign: 'center' }}>
          Day streak
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, textAlign: 'center', lineHeight: 20 }}>
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
                fontFamily: FONTS.sansBold,
                fontSize: 11,
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
                  <Check size={16} color="#ffffff" strokeWidth={3} />
                </View>
              ) : isToday ? (
                // TODAY: ZapIconWarm on top, bold orange date below — no border ring
                <View style={{ alignItems: 'center', height: 36, justifyContent: 'center' }}>
                  <ZapIconWarm size={16} />
                  <Text style={{ fontFamily: FONTS.sansBold, fontSize: 13, color: COLORS.brand, lineHeight: 16 }}>
                    {dateNum}
                  </Text>
                </View>
              ) : (
                <View style={{ height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 15, color: COLORS.textWeak }}>
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
          backgroundColor: '#F3F4F6',
          borderRadius: 20,
          paddingTop: 14,
          paddingBottom: 4,
          paddingHorizontal: 4,
        }}>
          <Text style={{
            fontFamily: FONTS.sansMedium,
            fontSize: 13,
            color: COLORS.textWeak,
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Streak restore coming soon
          </Text>
          <View style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            flexDirection: 'row',
            overflow: 'hidden',
          }}>
            {[
              { label: 'Days', value: stats.streak_count || user?.streak || 0 },
              { label: 'Reflections', value: stats.reflections_count || 0 },
              { label: 'Stories', value: stats.stories_count || 0 },
            ].map((item, i) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  paddingVertical: 20,
                  alignItems: 'center',
                  gap: 4,
                  borderRightWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
                  borderRightColor: '#E5E7EB',
                }}
              >
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textWeak }}>
                  {item.label}
                </Text>
                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 22, color: COLORS.textStrong }}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </BottomSheetView>
  );
}
