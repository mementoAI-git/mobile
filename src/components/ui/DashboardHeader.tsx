import React, { useCallback } from 'react';
import { View, ImageBackground, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { Search } from 'lucide-react-native';
import { Avatar } from './Avatar';
import { useUserStore, useUiStore } from '@/store';
import { useProfile } from '@/hooks/queries/use-profile';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import * as Haptics from 'expo-haptics';
import { ZapIconWarm } from './icons/CapsuleStatIcons';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

interface DashboardHeaderProps {
  title: string;
  showStreak?: boolean;
  showSearch?: boolean;
  rightElement?: React.ReactNode;
  /** Optional override — if not provided, DashboardHeader opens the streak sheet itself. */
  onStreakPress?: () => void;
  /** Optional override — if not provided, DashboardHeader opens the search-memory sheet itself. */
  onSearchPress?: () => void;
}

export function DashboardHeader({
  title,
  showStreak = true,
  showSearch = true,
  rightElement,
  onStreakPress,
  onSearchPress,
}: DashboardHeaderProps) {
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

  const handleSearchPress = useCallback(() => {
    Haptics.selectionAsync();
    if (onSearchPress) {
      onSearchPress();
    } else {
      openSheet('search-memory');
    }
  }, [onSearchPress, openSheet]);

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
        <View className="flex-row items-center gap-2">
          {rightElement}
          {showSearch && (
            <TouchableOpacity
              onPress={handleSearchPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Search memories"
              hitSlop={8}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLORS.fillWeaker,
              }}
            >
              <Search size={19} color={COLORS.textStrong} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {showStreak && (
            <TouchableOpacity
              onPress={handleStreakPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Current streak: ${streakCount} days`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 8,
              }}
            >
              <ZapIconWarm size={20} />
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
            accessibilityRole="button"
            accessibilityLabel="Account"
            className="border-2 border-transparent focus:border-brand/20 rounded-full ml-0.5"
          >
            <Avatar
              uri={activeUser?.picture_url || activeUser?.picture}
              name={activeUser?.fullname || activeUser?.first_name || activeUser?.email}
              size="lg"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
