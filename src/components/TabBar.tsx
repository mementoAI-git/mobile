import { useThemeColors, useThemeStyles, useResolvedAppearance } from '@/hooks/use-theme-colors';
/**
 * TabBar — Dynamic Dock
 *
 * Split layout:
 *   [  main pill: Overview · Chat · Stories · Topics · Capsule  ]  [○ Search]
 *
 * • Main pill: rounded-full, frosted glass surface, absolute positioned bottom-center
 * • All tabs: content-sized icon + label stacks; active tab gets a semantic fill
 * • Inactive tab: transparent surface, persistent label, at least 44px touch target
 * • Search: detached 56×56 circle, same glass surface, opens search-memory sheet
 * • Haptics on every press
 * • Tab bar hidden on chat/[id], stories/[id] and Settings child screens
 */

import React, { useCallback, memo, useRef } from 'react';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Pressable } from '@/components/ui/Touchable';
import Timer from 'lucide-react-native/icons/timer';
import Settings from 'lucide-react-native/icons/settings';
import Home from 'lucide-react-native/icons/house';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import BookOpen from 'lucide-react-native/icons/book-open';
import Compass from 'lucide-react-native/icons/compass';
import { TAB_ICONS as ICONS } from '@/constants/tab-icons';
import { type ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { resolveTabSwipeTarget } from '@/lib/tab-swipe';
import { getTabEntryParams } from '@/features/navigation/tab-reset-policy';
import { iconSize, minTouchTarget } from '@/constants/responsive';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

// ─── Assets ────────────────────────────────────────────────────────────────────



// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  chat:     'Chat',
  stories:  'Stories',
  explore:  'Topics',
  // capsule:  'Capsule', // Hidden in Dock UI
};

// ─── Glass surface style (shared between pill + search circle) ────────────────

const GLASS_BG = Platform.select({
  ios:     'rgba(254,251,248,0.88)',
  android: 'rgba(254,251,248,0.96)',
  default: 'rgba(254,251,248,0.96)',
});

// ─── Spring config ────────────────────────────────────────────────────────────



const PILL_H     = Platform.OS === 'android' ? 66 : 64;
const ICON_SIZE  = iconSize(24);

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
  navigate: (routeName: string, params?: { screen: 'index' }) => void;
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
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress(routeName, routeKey, isFocused);
  }, [onPress, routeName, routeKey, isFocused]);

  // ── Icon source ───────────────────────────────────────────────────────────
  const iconSource = ICONS[tabKey as keyof typeof ICONS] ?? null;

  return (
    <View style={styles.tabWrapper}>
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
        ) : tabKey === 'capsule' ? (
          <Timer
            size={ICON_SIZE}
            color={isFocused ? COLORS.brand : COLORS.textBase}
            strokeWidth={isFocused ? 2.2 : 1.8}
          />
        ) : tabKey === 'stories' ? (
          <BookOpen
            size={ICON_SIZE}
            color={isFocused ? COLORS.brand : COLORS.textBase}
            strokeWidth={isFocused ? 2.2 : 1.8}
          />
        ) : tabKey === 'chat' ? (
          <MessageCircle
            size={ICON_SIZE}
            color={isFocused ? COLORS.brand : COLORS.textBase}
            strokeWidth={isFocused ? 2.2 : 1.8}
          />
        ) : tabKey === 'explore' ? (
          <Compass
            size={ICON_SIZE}
            color={isFocused ? COLORS.brand : COLORS.textBase}
            strokeWidth={isFocused ? 2.2 : 1.8}
          />
        ) : (
          <Home
            size={ICON_SIZE}
            color={isFocused ? COLORS.brand : COLORS.textBase}
            strokeWidth={isFocused ? 2.2 : 1.8}
          />
        )}

        <Text
          style={[styles.tabLabel, { color: isFocused ? COLORS.textStrong : COLORS.textBase }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
});

// ─── Main TabBar ──────────────────────────────────────────────────────────────

export function TabBar({ state, navigation }: TabBarProps) {
  const dark = useResolvedAppearance() === 'dark';
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const pathname = usePathname();

  const settingsSelected = pathname === '/settings' || pathname.startsWith('/settings/');
  // Settings child pages are full-screen, like Insights: back button, no dock.
  const isHidden = pathname === '/chat' ||
    pathname.startsWith('/settings/') ||
    /^\/chat\/[^/]+$/.test(pathname) ||
    /^\/stories\/[^/]+$/.test(pathname);

  // ── Swipe responder (retained from original TabBar) ──────────────────────
  const stateRef = useRef(state);
  stateRef.current = state;
  const navRef = useRef(navigation);
  navRef.current = navigation;

  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 15 && Math.abs(dy) < 12,
      onPanResponderRelease: (_, { dx }) => {
        const visibleRoutes = stateRef.current.routes.filter(
          (r) => Boolean(TAB_LABELS[r.name.split('/')[0]]),
        );
        const currentRoute = stateRef.current.routes[stateRef.current.index];
        const currentVisibleIndex = visibleRoutes.findIndex(
          (r) => r.key === currentRoute?.key,
        );

        if (currentVisibleIndex === -1) return;

        const target = resolveTabSwipeTarget(
          currentVisibleIndex,
          visibleRoutes.length,
          dx,
        );
        if (target !== null && visibleRoutes[target]) {
          Haptics.selectionAsync();
          navRef.current.navigate(visibleRoutes[target].name, getTabEntryParams(visibleRoutes[target].name));
        }
      },
    }),
  ).current;

  // ── Tab press handler ─────────────────────────────────────────────────────
  const handleTabPress = useCallback((routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (isFocused || event.defaultPrevented) return;

    navigation.navigate(routeName, getTabEntryParams(routeName));
  }, [navigation]);

  const handleSettingsPress = useCallback(() => {
    Haptics.selectionAsync();
    if (!settingsSelected) router.navigate('/settings');
  }, [router, settingsSelected]);

  const bottomPad = insets.bottom ? insets.bottom + 16 : 32;

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
      style={[styles.root, { bottom: bottomPad, left: 16, right: 16, gap: 12 }, visibilityStyle]}
      pointerEvents={isHidden ? 'none' : 'box-none'}
      {...swipeResponder.panHandlers}
    >
      <MaskedView
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: 'absolute', left: -20, right: -20, top: -PILL_H / 2 - 64, bottom: -bottomPad, overflow: 'hidden' }}
        maskElement={
          <LinearGradient
            colors={['transparent', COLORS.textInverse, COLORS.textInverse]}
            locations={[0, 64 / (bottomPad + PILL_H / 2 + 64), 1]}
            style={{ flex: 1 }}
          />
        }
      >
        {Platform.OS === 'ios' && (
          <BlurView tint={dark ? 'dark' : 'light'} intensity={90} style={StyleSheet.absoluteFill} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? COLORS.glass : COLORS.popover }]} />
      </MaskedView>
      {/* ── Main pill ── */}
      <View style={[styles.pill, { backgroundColor: COLORS.popover, borderColor: COLORS.strokeWeak, borderWidth: 1 }]}>
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

      {/* ── Detached settings circle ── */}
      <Pressable
        onPress={handleSettingsPress}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        accessibilityState={{ selected: settingsSelected }}
        style={[styles.searchCircle, { width: screenWidth < 360 ? 48 : minTouchTarget(56), height: screenWidth < 360 ? 48 : minTouchTarget(56), backgroundColor: settingsSelected ? COLORS.fillWeak : COLORS.card, borderColor: COLORS.strokeWeak, borderWidth: 1 }]}
        android_ripple={{ color: COLORS.brandSubtle, borderless: true, radius: 28 }}
      >
        <Settings size={iconSize(22)} color={COLORS.textBase} strokeWidth={1.8} />
      </Pressable>
    </Animated.View>
  );
}

const DOCK_ROUTES = Object.keys(TAB_LABELS).map((name) => ({ key: name, name }));
const DOCK_PATHS: Record<string, Href> = {
  overview: '/(tabs)/overview',
  chat: '/(tabs)/chat',
  stories: '/(tabs)/stories',
  explore: '/(tabs)/explore',
};

export function AppTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split('/')[1];
  const navigate = useCallback((name: string) => {
    const path = DOCK_PATHS[name];
    if (path) router.navigate({ pathname: path, params: getTabEntryParams(name) } as Href);
  }, [router]);
  const navigation = React.useMemo(() => ({
    emit: () => ({ defaultPrevented: false }),
    navigate,
  }), [navigate]);

  if (!['overview', 'stories', 'explore', 'settings', 'capsule'].includes(section)) return null;

  return <TabBar state={{ routes: DOCK_ROUTES, index: DOCK_ROUTES.findIndex((route) => route.name === section) }} navigation={navigation} />;
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

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
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
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_H,
    borderRadius: 999,
    backgroundColor: GLASS_BG,
    padding: 4,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23,11,0,0.08)',
    ...PILL_SHADOW,
  },

  // Each tab — animated width wrapper
  tabWrapper: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 44,
    height: '100%',
    overflow: 'hidden',
    borderRadius: 999,
    minHeight: minTouchTarget(48),
  },

  // Pressable inside wrapper
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 6,
    gap: 2,
    minHeight: minTouchTarget(48),
  },

  // Active tab gets opaque nested pill bg
  tabPressableActive: {
    backgroundColor: COLORS.fillWeak,
    paddingHorizontal: 10,
  },

  // Tab icon
  tabIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },

  // Active label
  tabLabel: {
    ...TYPE.metadata,
    color: COLORS.textStrong,
    letterSpacing: 0.1,
  },

  // Detached search circle — 56 iOS, 56 Android (already ≥48dp Material minimum)
  searchCircle: {
    width: minTouchTarget(56),
    height: minTouchTarget(56),
    borderRadius: 999,
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
