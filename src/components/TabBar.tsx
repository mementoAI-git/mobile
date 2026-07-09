/**
 * TabBar — Dynamic Dock
 *
 * Split layout:
 *   [  main pill: Overview · Chat · Stories · Explore · Capsule  ]  [○ Search]
 *
 * • Main pill: rounded-full, frosted glass surface, absolute positioned bottom-center
 * • Active tab: expands with Reanimated spring, nested opaque pill bg, icon + label stacked
 * • Inactive tab: transparent, icon only, 44px touch target, label hidden
 * • Search: detached 56×56 circle, same glass surface, opens search-memory sheet
 * • Haptics on every press
 * • Tab bar hidden on chat/[id] and stories/[id] detail screens
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { Timer, Search, Home, MessageCircle, BookOpen, Compass } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { useUiStore } from '@/store';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

// ─── Assets ────────────────────────────────────────────────────────────────────

const ICONS = {
  overview: require('../../assets/images/icons/tab_overview.webp'),
  chat:     require('../../assets/images/icons/tab_chat.webp'),
  stories:  require('../../assets/images/icons/tab_stories.webp'),
  explore:  require('../../assets/images/icons/tab_explore.webp'),
  search:   require('../../assets/images/icons/tab_search.webp'),
  // tab_capsule.webp — add when ready; falls back to Lucide Timer
} as const;

// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  chat:     'Chat',
  stories:  'Memories',
  explore:  'Explore',
  capsule:  'Capsule',
};

// ─── Glass surface style (shared between pill + search circle) ────────────────

const GLASS_BG = Platform.select({
  ios:     'rgba(254,251,248,0.88)',
  android: 'rgba(254,251,248,0.96)',
  default: 'rgba(254,251,248,0.96)',
});

// ─── Spring config ────────────────────────────────────────────────────────────

const SPRING = { damping: 22, stiffness: 280, mass: 0.8 };

// Widths
// Android Material minimum touch target is 48dp; iOS HIG is 44pt.
const INACTIVE_W = Platform.OS === 'android' ? 64 : 60;
const ACTIVE_W   = 96;  // expanded pill with label
const PILL_H     = Platform.OS === 'android' ? 60 : 58;
const ICON_SIZE  = 26;

type TabRoute = {
  key: string;
  name: string;
};

type TabNavigation = {
  emit: (event: {
    type: 'tabPress';
    target: string;
    canPreventDefault: true;
  }) => { defaultPrevented: boolean };
  navigate: (routeName: string) => void;
};

type TabBarProps = {
  state: {
    index: number;
    routes: TabRoute[];
  };
  navigation: TabNavigation;
};

// ─── Single tab item ──────────────────────────────────────────────────────────

interface TabItemProps {
  routeKey: string;
  routeName: string;
  tabKey: string;
  isFocused: boolean;
  label: string;
  onPress: (routeName: string, routeKey: string, isFocused: boolean) => void;
}

const TabItem = memo(function TabItem({
  routeKey,
  routeName,
  tabKey,
  isFocused,
  label,
  onPress,
}: TabItemProps) {

  // ── Width animation ───────────────────────────────────────────────────────
  const width = useSharedValue(isFocused ? ACTIVE_W : INACTIVE_W);

  React.useEffect(() => {
    width.value = withSpring(isFocused ? ACTIVE_W : INACTIVE_W, SPRING);
  }, [isFocused, width]);

  const containerStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress(routeName, routeKey, isFocused);
  }, [onPress, routeName, routeKey, isFocused]);

  // ── Icon source ───────────────────────────────────────────────────────────
  const iconSource = ICONS[tabKey as keyof typeof ICONS] ?? null;

  return (
    <Animated.View style={[styles.tabWrapper, containerStyle]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
        style={[styles.tabPressable, isFocused && styles.tabPressableActive]}
        android_ripple={{ color: COLORS.brandSubtle, borderless: true, radius: 28 }}
      >
        {/* Icon */}
        {iconSource ? (
          <Image
            source={iconSource}
            style={styles.tabIcon}
            resizeMode="contain"
          />
        ) : (
          // Fallback Lucide icon (Capsule tab until asset is added)
          <Timer
            size={ICON_SIZE}
            color={isFocused ? COLORS.textStrong : COLORS.textMuted}
            strokeWidth={isFocused ? 2.2 : 1.8}
          />
        )}

        {/* Label — only rendered when active */}
        {isFocused && (
          <Animated.Text
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.tabLabel}
            numberOfLines={1}
          >
            {label}
          </Animated.Text>
        )}
      </Pressable>
    </Animated.View>
  );
});

// ─── Main TabBar ──────────────────────────────────────────────────────────────

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const openSheet = useUiStore(s => s.openSheet);

  const handleTabPress = useCallback((routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (isFocused || event.defaultPrevented) return;

    navigation.navigate(routeName);
  }, [navigation]);

  const handleSearchPress = useCallback(() => {
    Haptics.selectionAsync();
    openSheet('search-memory');
  }, [openSheet]);

  // Host Chat owns the full bottom interaction area; detail screens do as well.
  const isHidden =
    pathname === '/chat' ||
    !!pathname.match(/^\/chat\/[^/]+$/) ||
    !!pathname.match(/^\/(tabs\/)?stories\/[^/]+$/);

  const bottomPad = insets.bottom ? insets.bottom + 24 : 36;

  // Keep the view always mounted — avoid the remount/race-condition that causes
  // the bar to freeze on returning from a hidden screen. Animate via shared value.
  const translateY = useSharedValue(isHidden ? 120 : 0);
  const opacity = useSharedValue(isHidden ? 0 : 1);

  React.useEffect(() => {
    translateY.value = withTiming(isHidden ? 120 : 0, { duration: 220 });
    opacity.value = withTiming(isHidden ? 0 : 1, { duration: 200 });
  }, [isHidden, translateY, opacity]);

  const visibilityStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.root, { bottom: bottomPad }, visibilityStyle]}
      pointerEvents={isHidden ? 'none' : 'box-none'}
    >
      {/* ── Main pill ── */}
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tabKey = route.name.split('/')[0];
          const label = TAB_LABELS[tabKey];
          if (!label) return null;

          return (
            <TabItem
              key={route.key}
              routeKey={route.key}
              routeName={route.name}
              tabKey={tabKey}
              isFocused={isFocused}
              label={label}
              onPress={handleTabPress}
            />
          );
        })}
      </View>

      {/* ── Detached search circle ── */}
      <Pressable
        onPress={handleSearchPress}
        accessibilityRole="button"
        accessibilityLabel="Search"
        style={styles.searchCircle}
        android_ripple={{ color: COLORS.brandSubtle, borderless: true, radius: 28 }}
      >
        {ICONS.search ? (
          <Image source={ICONS.search} style={styles.searchIcon} resizeMode="contain" />
        ) : (
          <Search size={22} color={COLORS.textBase} strokeWidth={1.8} />
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const PILL_SHADOW = Platform.select({
  ios: {
    shadowColor: '#170B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  // Material elevation 8 = floating pill (matches FAB-level prominence)
  android: { elevation: 8 },
  default: {},
});

const styles = StyleSheet.create({
  // height: 0 collapses the React Navigation wrapper to nothing so its
  // background disappears. The pill + circle float via position: absolute
  // and don't need the parent to have any height.
  root: {
    height: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 100,
  },

  // Glass pill — flexShrink so it doesn't crowd out the search circle
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_H,
    borderRadius: 999,
    backgroundColor: GLASS_BG,
    paddingHorizontal: 6,
    gap: 4,
    flexShrink: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23,11,0,0.08)',
    ...PILL_SHADOW,
  },

  // Each tab — animated width wrapper
  tabWrapper: {
    height: PILL_H - 8,
    overflow: 'hidden',
    borderRadius: 999,
  },

  // Pressable inside wrapper
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    gap: 3,
  },

  // Active tab gets opaque nested pill bg
  tabPressableActive: {
    backgroundColor: 'rgba(23,11,0,0.07)',
    paddingHorizontal: 10,
  },

  // Tab icon
  tabIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },

  // Active label
  tabLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 11,
    color: COLORS.textStrong,
    letterSpacing: 0.1,
  },

  // Detached search circle — 56 iOS, 56 Android (already ≥48dp Material minimum)
  searchCircle: {
    width: Platform.OS === 'android' ? 56 : 56,
    height: Platform.OS === 'android' ? 56 : 56,
    borderRadius: 28,
    backgroundColor: GLASS_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23,11,0,0.08)',
    flexShrink: 0,
    ...PILL_SHADOW,
  },

  searchIcon: {
    width: 24,
    height: 24,
  },
});
