import React, { useCallback, memo } from 'react';
import { View, Pressable, Text } from 'react-native';
import { type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  MessageCircle,
  BookOpen,
  Compass,
  Timer,
} from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { COLORS, FONTS } from '@/constants/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

type LucideIcon = typeof LayoutDashboard;

interface TabConfig {
  Icon: LucideIcon;
  label: string;
}

// Swapped emoji for lucide-react-native icons — matches web Lucide SVG icon set
// Active state: brand orange icon + label, orange dot indicator
// Inactive:     rgba(23,11,0,0.25) = text-disabled / icon muted
// Tab bar bg:   #fefbf8 cream (web --background), not white
const TAB_CONFIG: Record<string, TabConfig> = {
  overview: { Icon: LayoutDashboard, label: 'Overview' },
  chat:     { Icon: MessageCircle,   label: 'Chat' },
  stories:  { Icon: BookOpen,        label: 'Memories' },
  explore:  { Icon: Compass,         label: 'Explore' },
  capsule:  { Icon: Timer,           label: 'Capsule' },
};

interface TabItemProps {
  routeKey: string;
  routeName: string;
  isFocused: boolean;
  tab: TabConfig;
  accessibilityLabel: string;
  onPress: (routeName: string, routeKey: string, isFocused: boolean) => void;
}

/** Memoized single tab item — prevents siblings from re-rendering on focus change */
const TabItem = memo(function TabItem({
  routeKey,
  routeName,
  isFocused,
  tab,
  accessibilityLabel,
  onPress,
}: TabItemProps) {
  const { Icon, label } = tab;
  const iconColor = isFocused ? COLORS.brand : COLORS.textMuted;

  const handlePress = useCallback(() => {
    onPress(routeName, routeKey, isFocused);
  }, [onPress, routeName, routeKey, isFocused]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      className="flex-1 items-center gap-0.5 py-1"
      android_ripple={{ color: COLORS.brandSubtle, borderless: true }}
    >
      {/* Active indicator dot */}
      <View className={cn('w-1 h-1 rounded-full mb-0.5', isFocused ? 'bg-brand' : 'bg-transparent')} />

      <Icon
        size={22}
        color={iconColor}
        strokeWidth={isFocused ? 2.2 : 1.8}
      />
      <Text
        className={cn('text-[10px]')}
        style={{
          fontFamily: isFocused ? FONTS.sansSemi : FONTS.sans,
          color: iconColor,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Stable handler — MUST be declared before any conditional return (Rules of Hooks)
  const handleTabPress = useCallback((routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }, [navigation]);

  // Hide tab bar on specific nested screens (chat detail, story detail)
  if (pathname.match(/^\/chat\/[^\/]+$/) || pathname.match(/^\/stories\/[^\/]+$/)) {
    return null;
  }

  return (
    <View
      className="flex-row bg-background border-t border-stroke-weak px-2 pt-2"
      style={{ paddingBottom: insets.bottom ? insets.bottom + 4 : 16 }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        // Strip nested route paths (e.g. "overview/index" → "overview")
        const tabKey = route.name.split('/')[0];
        const tab = TAB_CONFIG[tabKey];

        if (!tab) return null;

        return (
          <TabItem
            key={route.key}
            routeKey={route.key}
            routeName={route.name}
            isFocused={isFocused}
            tab={tab}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? tab.label}
            onPress={handleTabPress}
          />
        );
      })}
    </View>
  );
}
