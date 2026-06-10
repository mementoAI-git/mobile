import React from 'react';
import { View, ImageBackground, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Zap } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { useUserStore } from '@/store';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

interface DashboardHeaderProps {
  title: string;
  showStreak?: boolean;
  rightElement?: React.ReactNode;
  /** Called when the streak pill is tapped — use to open a streak modal. */
  onStreakPress?: () => void;
}

export function DashboardHeader({ title, showStreak = true, rightElement, onStreakPress }: DashboardHeaderProps) {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const streakCount = Number(user?.streak) || 0;

  return (
    <View className="relative bg-background overflow-hidden">
      <ImageBackground source={PATTERN} className="absolute inset-0 opacity-20" />
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 min-h-[64px]">
        <Animated.Text
          className="text-[28px] text-text-strong"
          style={{ fontFamily: FONTS.serif }}
        >
          {title}
        </Animated.Text>
        <View className="flex-row items-center gap-3">
          {rightElement}
          {showStreak && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); onStreakPress?.(); }}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                // backgroundColor: COLORS.fillWeaker,
                // backgroundColor: `${COLORS.brand}50`,
                backgroundColor: `#FFC02E1A`,
                borderRadius: 8,
              }}
            >
              <Zap size={16} color={COLORS.brand} fill={COLORS.brand} />
              <Animated.Text style={{ fontFamily: FONTS.geist, fontSize: 14, color: COLORS.textStrong }}>
                {streakCount}
              </Animated.Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/settings/profile');
            }}
            activeOpacity={0.8}
            className="border-2 border-transparent focus:border-brand/20 rounded-full ml-1"
          >
            <Avatar uri={user?.picture_url} name={user?.first_name || user?.email} size="md" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
