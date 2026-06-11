import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import { useUiStore, useUserStore } from '@/store';
import { useUserStats } from '@/hooks/queries/use-overview';
import { COLORS, FONTS } from '@/constants/tokens';

function getStreakSubtitle(days: number, nickname?: string): string {
  const name = nickname ? `, ${nickname}` : '';
  if (days >= 21) return `You are a legend${name}. Keep it up!`;
  if (days >= 8) return `You are on a roll${name}. Keep it up!`;
  if (days === 7) return `A full week${name}. Your story is taking shape!`;
  if (days >= 3) return `Great rhythm${name}. Keep it up!`;
  return `Every story starts somewhere${name}. You've got this!`;
}

const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function StreakSheet() {
  const user = useUserStore((s) => s.user);
  const { data: statsData } = useUserStats();
  const stats = statsData ?? {} as any;

  const streakCount = Number(user?.streak) || Number(stats.streak_count) || 0;
  const weekStreak = streakCount > 0 ? Math.floor(streakCount / 7) : 0;
  const today = new Date();
  const todayDow = today.getDay();
  const nickname = user?.nickname || user?.first_name || '';
  const streakStart = Math.max(0, todayDow - (streakCount - 1));

  return (
    <BottomSheetView style={{ paddingBottom: 36 }}>
      {/* Fire circle + number */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View style={{
          width: 120, height: 120, borderRadius: 60,
          borderWidth: 2, borderColor: '#93C5FD',
          backgroundColor: 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 64, lineHeight: 72 }}>🔥</Text>
        </View>
        <Text style={{
          fontFamily: FONTS.serif, fontSize: 52, fontWeight: '700',
          color: COLORS.textStrong, marginTop: -18, lineHeight: 56,
        }}>
          {weekStreak}
        </Text>
      </View>

      {/* Title + subtitle */}
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 32, paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: FONTS.serif, fontSize: 26, fontWeight: '700', color: COLORS.textStrong }}>
          Week streak
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 14, color: COLORS.textWeak, textAlign: 'center' }}>
          {getStreakSubtitle(streakCount, nickname)}
        </Text>
      </View>

      {/* Week calendar */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 28, paddingHorizontal: 16 }}>
        {WEEK_LABELS.map((label, index) => {
          const isToday = index === todayDow;
          const isPastStreak = streakCount > 0 && index < todayDow && index >= streakStart;
          const diff = index - todayDow;
          const d = new Date(today);
          d.setDate(today.getDate() + diff);
          const dateNum = d.getDate();

          return (
            <View key={index} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Text style={{
                fontFamily: FONTS.sansBold, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: 0.5,
                color: isToday ? '#F97316' : COLORS.textMuted,
              }}>
                {isToday ? 'TODAY' : label}
              </Text>

              {isPastStreak ? (
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={16} color="white" strokeWidth={3} />
                </View>
              ) : isToday ? (
                <View style={{ alignItems: 'center', height: 36, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, lineHeight: 20 }}>⚡</Text>
                  <Text style={{ fontFamily: FONTS.sansBold, fontSize: 13, color: '#F97316', lineHeight: 16 }}>{dateNum}</Text>
                </View>
              ) : (
                <View style={{ height: 36, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 15, color: COLORS.textWeak }}>{dateNum}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Bottom stats card */}
      <View style={{ marginHorizontal: 16 }}>
        <View style={{ backgroundColor: '#F3F4F6', borderRadius: 20, paddingTop: 14, paddingBottom: 4, paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 13, color: COLORS.textWeak, textAlign: 'center', marginBottom: 8 }}>
            Streak restore coming soon
          </Text>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, flexDirection: 'row', overflow: 'hidden' }}>
            {[
              { label: 'Days', value: stats.streak_count || user?.streak || 0 },
              { label: 'Reflections', value: stats.reflections_count || 0 },
              { label: 'Stories', value: stats.stories_count || 0 },
            ].map((item, i) => (
              <View key={item.label} style={{ flex: 1, paddingVertical: 20, alignItems: 'center', gap: 4, borderRightWidth: i < 2 ? StyleSheet.hairlineWidth : 0, borderRightColor: '#E5E7EB' }}>
                <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textWeak }}>{item.label}</Text>
                <Text style={{ fontFamily: FONTS.sansBold, fontSize: 22, color: COLORS.textStrong }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </BottomSheetView>
  );
}
