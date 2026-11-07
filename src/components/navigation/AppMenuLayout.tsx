import { appearanceLabel } from '@/features/appearance/appearance';
import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackHandler, Image, ImageBackground, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter, type Href } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft, ReduceMotion } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { TAB_ICONS } from '@/constants/tab-icons';
import { iconSize } from '@/constants/responsive';
import SunMoon from 'lucide-react-native/icons/sun-moon';
import { useAppearanceStore } from '@/store/appearance.store';
import Search from 'lucide-react-native/icons/search';
import Settings from 'lucide-react-native/icons/settings';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pressable } from '@/components/ui/Touchable';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, MEMORY_PROMPT_GRADIENT } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useUiStore, useUserStore } from '@/store';
import { canSwipeOpenMenu, MENU_SWIPE_EDGE_WIDTH, shouldOpenMenuFromSwipe } from '@/features/navigation/menu-swipe';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const DESTINATIONS = [
  { label: 'Overview', path: '/(tabs)/overview', segment: '/overview', icon: TAB_ICONS.overview },
  { label: 'Chat', path: '/(tabs)/chat', segment: '/chat', icon: TAB_ICONS.chat },
  { label: 'My Stories', path: '/(tabs)/stories', segment: '/stories', icon: TAB_ICONS.stories },
  { label: 'Explore', path: '/(tabs)/explore', segment: '/explore', icon: TAB_ICONS.explore },
] as const;

function MenuDestination({ item }: { item: (typeof DESTINATIONS)[number] }) {
  const router = useRouter();
  const pathname = usePathname();
  const selected = pathname === item.segment || pathname.startsWith(`${item.segment}/`);
  const handlePress = useCallback(() => {
    useUiStore.getState().closeMenu();
    router.navigate(item.path);
  }, [item.path, router]);
  return (
    <Button
      variant="ghost"
      size="menu"
      className={selected ? 'justify-start bg-fill-weak' : 'justify-start'}
      textClassName="text-text-strong"
      leftIcon={<Image source={item.icon} style={{ width: iconSize(26), height: iconSize(26) }} resizeMode="contain" />}
      accessibilityLabel={selected ? `${item.label}, current page` : item.label}
      onPress={handlePress}
    >
      {item.label}
    </Button>
  );
}

function AppMenu() {
  const COLORS = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const initialPath = useRef(pathname);
  const user = useUserStore((s) => s.user);
  const closeMenu = useUiStore((s) => s.closeMenu);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelRef = useRef<View>(null);
  const preference = useAppearanceStore((s) => s.preference);
  const openAppearance = useCallback(() => useUiStore.getState().openSheet('appearance'), []);
  const name = user?.fullname || user?.nickname || user?.first_name || 'Your account';

  const dismiss = useCallback(() => {
    void Haptics.selectionAsync();
    closeMenu();
  }, [closeMenu]);
  const navigate = useCallback((path: Href) => {
    closeMenu();
    router.navigate(path);
  }, [closeMenu, router]);
  const openAccount = useCallback(() => navigate('/account'), [navigate]);
  const openSettings = useCallback(() => navigate('/settings'), [navigate]);
  const openSearch = useCallback(() => useUiStore.getState().openSheet('search-memory'), []);


  useEffect(() => {
    if (pathname !== initialPath.current) closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => back.remove();
  }, [dismiss]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current as unknown as HTMLElement | null;
    const getButtons = () => Array.from(panel?.querySelectorAll<HTMLElement>('[role="button"], button, [tabindex="0"]') ?? []);
    getButtons()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
      }
      if (event.key === 'Tab') {
        const buttons = getButtons();
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [dismiss]);

  return (
    <View className="absolute inset-0" accessibilityViewIsModal onAccessibilityEscape={dismiss}>
      <Animated.View
        className="absolute inset-0"
        entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
      >
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: COLORS.shadow, opacity: 0.3 }}
          onPress={dismiss}
          accessibilityLabel="Close app menu"
          accessibilityRole="button"
          voiceLabel={false}
        />
      </Animated.View>
      <Animated.View
        className="absolute left-0 top-0 bottom-0 bg-card rounded-r-[32px] overflow-hidden"
        style={{ width: Math.min(360, width * 0.86) }}
        entering={SlideInLeft.duration(280).reduceMotion(ReduceMotion.System)}
        exiting={SlideOutLeft.duration(220).reduceMotion(ReduceMotion.System)}
      >
        <ImageBackground source={PATTERN} className="absolute inset-0" imageStyle={{ opacity: 0.03 }} resizeMode="repeat" />
        <View ref={panelRef} className="flex-1 px-5" style={{ paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }}>
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View className="gap-3">
              <Button variant="ghost" iconOnly onPress={openAccount} className="overflow-hidden rounded-[14px]" accessibilityLabel={`View account for ${name}`}>
                <LinearGradient {...MEMORY_PROMPT_GRADIENT} style={{ width: '100%' }}>
                  <View className="flex-row items-center w-full gap-3" style={{ padding: 12 }}>
                    <Avatar uri={user?.picture_url || user?.picture} name={name} userId={user?._id} seed={user?.email} size="lg" />
                    <View className="flex-1 min-w-0">
                      <Text style={[TYPE.bodyStrong, { color: COLORS.textInverse }]} numberOfLines={2}>{name}</Text>
                      <Text style={[TYPE.bodySmall, { color: COLORS.textInverse }]} className="mt-1" numberOfLines={1} ellipsizeMode="tail">{user?.email}</Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.textInverse} />
                  </View>
                </LinearGradient>
              </Button>
              <Button variant="outline" size="menu" className="justify-start" textClassName="text-text-weak" leftIcon={<Search size={20} color={COLORS.textWeak} />} onPress={openSearch}>
                Search memories
              </Button>
            </View>
            <View style={{ marginTop: 32 }}>
              <Text style={TYPE.eyebrow} className="text-text-weak uppercase tracking-widest mb-3 px-3">Your space</Text>
              <View className="gap-1">
                {DESTINATIONS.map((item) => <MenuDestination key={item.path} item={item} />)}
              </View>
            </View>
          </ScrollView>
          <Button variant="outline" size="menu" className="mb-3 justify-start" leftIcon={<SunMoon size={21} color={COLORS.textBase} />} onPress={openAppearance} accessibilityLabel={`Appearance: ${appearanceLabel(preference)}`}>
            {`Appearance · ${appearanceLabel(preference)}`}
          </Button>
          <Button variant="outline" size="menu-settings" className="rounded-[100px]" leftIcon={<Settings size={21} color={COLORS.textBase} />} onPress={openSettings}>Settings</Button>
        </View>
      </Animated.View>
    </View>
  );
}

/** Shared overlay keeps the side menu above navigation and hides the page from assistive technology. */
export function AppMenuLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const menuOpen = useUiStore((s) => s.menuOpen);
  const activeSheet = useUiStore((s) => s.activeSheet);
  const swipeEnabled = Platform.OS !== 'web' && canSwipeOpenMenu(pathname, menuOpen, activeSheet);
  const openFromSwipe = useCallback(() => {
    const state = useUiStore.getState();
    if (!canSwipeOpenMenu(pathname, state.menuOpen, state.activeSheet)) return;
    void Haptics.selectionAsync();
    state.openMenu();
  }, [pathname]);
  const edgeSwipe = useMemo(() => Gesture.Pan()
    .enabled(swipeEnabled)
    .hitSlop({ left: 0, width: MENU_SWIPE_EDGE_WIDTH })
    .maxPointers(1)
    .activeOffsetX(16)
    .failOffsetX(-8)
    .failOffsetY([-12, 12])
    .onEnd((event) => {
      if (shouldOpenMenuFromSwipe(event.translationX, event.translationY, event.velocityX)) {
        scheduleOnRN(openFromSwipe);
      }
    }), [swipeEnabled, openFromSwipe]);

  return (
    <GestureDetector gesture={edgeSwipe}>
      <View className="flex-1" collapsable={false}>
        <View className="flex-1" pointerEvents={menuOpen ? 'none' : 'auto'} accessibilityElementsHidden={menuOpen} importantForAccessibility={menuOpen ? 'no-hide-descendants' : 'auto'}>
          {children}
        </View>
        {menuOpen && <AppMenu />}
      </View>
    </GestureDetector>
  );
}
