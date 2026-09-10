import React, { useCallback } from 'react';
import { View, ImageBackground, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Zap } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { useUserStore, useUiStore } from '@/store';
import { useProfile } from '@/hooks/queries/use-profile';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import * as Haptics from 'expo-haptics';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

interface DashboardHeaderProps {
  title: string;
  showStreak?: boolean;
  rightElement?: React.ReactNode;
  /** Optional override — if not provided, DashboardHeader opens the streak sheet itself. */
  onStreakPress?: () => void;
}

export function DashboardHeader({ title, showStreak = true, rightElement, onStreakPress }: DashboardHeaderProps) {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const { data: profile } = useProfile();
  const activeUser = profile || user;
  const openSheet = useUiStore((s) => s.openSheet);
  const streakCount = Number(activeUser?.streak) || 0;

  const handleStreakPress = useCallback(() => {
    Haptics.selectionAsync();
    if (onStreakPress) {
      onStreakPress();
    } else {
      openSheet('streak');
    }
  }, [onStreakPress, openSheet]);

  return (
    <View className="relative bg-background overflow-hidden">
      <ImageBackground source={PATTERN} className="absolute inset-0 opacity-20" />
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 min-h-[64px]">
        <Animated.Text
          className="text-text-strong"
          style={TYPE.screenTitle}
        >
          {title}
        </Animated.Text>
        <View className="flex-row items-center gap-3">
          {rightElement}
          {showStreak && (
            <TouchableOpacity
              onPress={handleStreakPress}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                // backgroundColor: COLORS.fillWeaker,
                // backgroundColor: `${COLORS.brand}50`,
                backgroundColor: COLORS.brandSubtle,
                borderRadius: 8,
              }}
            >
              <Zap size={16} color={COLORS.brand} fill={COLORS.brand} />
              <Animated.Text style={{ ...TYPE.label, color: COLORS.textStrong }}>
                {streakCount}
              </Animated.Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/account');
            }}
            activeOpacity={0.8}
            hitSlop={4}
            className="border-2 border-transparent focus:border-brand/20 rounded-full ml-1"
          >
            <Avatar
              uri={activeUser?.picture_url || activeUser?.picture}
              name={activeUser?.fullname || activeUser?.first_name || activeUser?.email}
              size="md"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
