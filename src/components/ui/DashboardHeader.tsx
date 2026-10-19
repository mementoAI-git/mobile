import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import Animated from 'react-native-reanimated';
import House from 'lucide-react-native/icons/house';
import { Button } from './Button';
import Search from 'lucide-react-native/icons/search';
import { QuickToolsIcon } from './icons/QuickToolsIcon';
import { useUserStore, useUiStore } from '@/store';
import { useProfile } from '@/hooks/queries/use-profile';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, responsiveSpace } from '@/constants/responsive';
import * as Haptics from 'expo-haptics';
import { ZapIconWarm } from './icons/CapsuleStatIcons';

interface DashboardHeaderProps {
  title: string;
  compactTitle?: boolean;
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
  compactTitle = false,
  showStreak = true,
  showSearch = true,
  rightElement,
  onStreakPress,
  onSearchPress,
}: DashboardHeaderProps) {
  const COLORS = useThemeColors();
  const user = useUserStore((s) => s.user);
  const { data: profile } = useProfile();
  const activeUser = profile || user;
  const openSheet = useUiStore((s) => s.openSheet);
  const openMenu = useUiStore((s) => s.openMenu);
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

  const handleQuickToolsPress = useCallback(() => {
    openSheet('quick-tools');
  }, [openSheet]);

  return (
    <View className="relative overflow-hidden" style={{ backgroundColor: COLORS.background }}>
      <View
        className="flex-row items-center justify-between"
        style={{
          paddingHorizontal: 16,
          paddingTop: responsiveSpace(16),
          paddingBottom: responsiveSpace(12),
          minHeight: minTouchTarget(64),
        }}
      >
        <View className="flex-1 flex-row items-center" style={{ gap: responsiveSpace(10), marginRight: responsiveSpace(8) }}>
          <View style={{ width: 44, height: 44, flexShrink: 0 }}>
            <Button onPress={openMenu} variant="secondary" rounded="full" iconOnly className="w-full h-full" style={{ width: 44, height: 44, minHeight: 44 }} accessibilityLabel="Open app menu">
              <House size={iconSize(20)} color={COLORS.textStrong} strokeWidth={1.8} />
            </Button>
          </View>
          <Animated.Text
            className="text-text-strong flex-shrink"
            style={compactTitle ? TYPE.dashboardTitleSmall : TYPE.dashboardTitle}
          >
            {title}
          </Animated.Text>
        </View>
        <View className="flex-row items-center" style={{ gap: responsiveSpace(8) }}>
          {rightElement}
          {showSearch && (
            <TouchableOpacity
              onPress={handleSearchPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Search memories"
              hitSlop={8}
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Search size={iconSize(19)} color={COLORS.textStrong} strokeWidth={2} />
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
                width: 44,
                height: 44,
                justifyContent: 'center',
                gap: 3,
                borderRadius: 22,
              }}
            >
              <ZapIconWarm size={iconSize(20)} />
              <Animated.Text style={{ ...TYPE.label, color: COLORS.textStrong }}>
                {streakCount}
              </Animated.Text>
            </TouchableOpacity>
          )}
          <View style={{ width: 44, height: 44, flexShrink: 0 }}>
            <Button
              onPress={handleQuickToolsPress}
              variant="secondary"
              rounded="full"
              iconOnly
              className="w-full h-full"
              style={{ width: 44, height: 44, minHeight: 44 }}
              accessibilityLabel="Quick tools"
            >
              <QuickToolsIcon />
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}
