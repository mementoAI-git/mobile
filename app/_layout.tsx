import '../global.css';
import React, { useEffect } from 'react';
import { StyleSheet, Platform, LogBox, StatusBar as RNStatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

// Suppress Reanimated strict-mode "reading from value during render" warnings.
// These come from useSharedValue + direct .value reads in card press handlers
// and are harmless — they don't affect correctness or performance.
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

LogBox.ignoreLogs([
  // Comes from moti's internal SafeAreaView usage — not our code, nothing to fix.
  'SafeAreaView has been deprecated',
  // Expo Router fires this in Expo Go because chat/[id] is a root-level stack screen
  // that lives outside the (tabs) group. It works correctly — just noisy in Go.
  '[Layout children]',
]);

import * as Sentry from '@sentry/react-native';

if (Platform.OS === 'web') {
  (StyleSheet as any).setFlag?.('darkMode', 'class');
}

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  EBGaramond_400Regular,
  EBGaramond_500Medium,
  EBGaramond_700Bold,
} from '@expo-google-fonts/eb-garamond';
import { AzeretMono_400Regular } from '@expo-google-fonts/azeret-mono';
import { Geist_400Regular, Geist_700Bold } from '@expo-google-fonts/geist';
import { PatrickHandSC_400Regular } from '@expo-google-fonts/patrick-hand-sc';
import { Handlee_400Regular } from '@expo-google-fonts/handlee';
import { CutiveMono_400Regular } from '@expo-google-fonts/cutive-mono';
import {
  AveriaSerifLibre_400Regular,
  AveriaSerifLibre_700Bold,
} from '@expo-google-fonts/averia-serif-libre';
import { useAuthStore, useUserStore, useUiStore } from '@/store';
import { authService } from '@/api/auth-service';
import { ToastProvider } from '@/components/ui/Toast';
import { OfflineNotice } from '@/components/ui/OfflineNotice';
import { AppErrorBoundary } from '@/components/system/AppErrorBoundary';
import { useNotifications } from '@/hooks/use-notifications';
import { COLORS } from '@/constants/tokens';
import { SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE } from '@/lib/env';
import { normalizeAppHref } from '@/lib/navigation';
import { logger } from '@/lib/logger';
import { StatusBar } from 'expo-status-bar';
import { useShareIntentContext, ShareIntentProvider } from 'expo-share-intent';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    tracesSampleRate: Number.isFinite(SENTRY_TRACES_SAMPLE_RATE) ? SENTRY_TRACES_SAMPLE_RATE : 0.2,
    sendDefaultPii: false,
  });
}

// ─── Share intent watcher — handles shares while app is already open ──────────

function ShareIntentWatcher() {
  const { shareIntent } = useShareIntentContext();
  const router = useRouter();
  // Guard: only navigate once per unique intent — prevents infinite re-render loop.
  // expo-share-intent may return a stub in Expo Go; the ref ensures we never
  // call router.push more than once for the same shareIntent object.
  const handledRef = React.useRef(false);

  useEffect(() => {
    if (!shareIntent || handledRef.current) return;
    handledRef.current = true;
    // Small defer so navigation stack is fully mounted before pushing
    const t = setTimeout(() => {
      router.push('/share');
    }, 100);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareIntent]);

  // Reset guard when intent is cleared
  useEffect(() => {
    if (!shareIntent) {
      handledRef.current = false;
    }
  }, [shareIntent]);

  return null;
}

function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  // Initialize notifications
  const { expoPushToken } = useNotifications();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    EBGaramond_700Bold,
    AzeretMono_400Regular,
    PatrickHandSC_400Regular,
    Handlee_400Regular,
    CutiveMono_400Regular,
    AveriaSerifLibre_400Regular,
    AveriaSerifLibre_700Bold,
    Geist_400Regular,
    Geist_700Bold,

    // Map web font family names directly to React Native loaded fonts
    'Patrick Hand SC': PatrickHandSC_400Regular,
    'Handlee': Handlee_400Regular,
    'Cutive': CutiveMono_400Regular,
    'Portrait Script': require('../assets/fonts/Portrait-script-regular.ttf'),
    'Garamond': EBGaramond_400Regular,
    'Sans': Inter_400Regular,
    // Fixed: was incorrectly mapped to AzeretMono — Geist is a distinct geometric sans
    'Geist': Geist_400Regular,
    'Geist Bold': Geist_700Bold,
    'Geist Mono': AzeretMono_400Regular, // kept for capsule theme backward-compat
    'Averia Serif Libre': AveriaSerifLibre_400Regular,
    'Averia Serif Libre Bold': AveriaSerifLibre_700Bold,
  });

  // Wire up the redirect fn for auth-service token refresh failures
  useEffect(() => {
    authService.setRedirectFn(() => {
      if (rootNavigationState?.key) {
        router.replace('/(auth)/login');
      }
    });
  }, [router, rootNavigationState]);

  // Hydrate auth from SecureStore on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Guard navigation based on auth state
  useEffect(() => {
    if (!hydrated || !rootNavigationState?.key) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboard = segments[0] === '(onboard)';

    const timer = setTimeout(() => {
      if (!token) {
        if (!inAuth) {
          const currentPath = `/${segments.join('/')}`;
          const pendingHref = normalizeAppHref(currentPath);
          if (pendingHref) {
            useUiStore.getState().setPendingDeepLink(pendingHref);
          }
          router.replace('/(auth)/login');
        }
      } else {
        const user = useUserStore.getState().user;
        if (user && user.onboarding_status === 'never' && !inOnboard) {
          router.replace('/(onboard)');
        } else if (inAuth || inOnboard) {
          router.replace('/(tabs)/overview');
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [hydrated, token, segments, router, rootNavigationState]);

  // Process pending deep links after successful auth and navigation to tabs
  useEffect(() => {
    const pendingDeepLink = useUiStore.getState().pendingDeepLink;
    const setPendingDeepLink = useUiStore.getState().setPendingDeepLink;
    const inTabs = segments[0] === '(tabs)';

    if (token && pendingDeepLink && inTabs) {
      // Wait a tiny bit for the initial tab navigation to settle
      const timer = setTimeout(() => {
        router.push(pendingDeepLink);
        setPendingDeepLink(null);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [token, segments, router]);

  // Sync push token to backend
  useEffect(() => {
    if (token && expoPushToken) {
      import('@/api/mutations').then(({ put }) => {
        import('@/api/endpoint').then(({ default: endpoint }) => {
          put(endpoint.profile, { push_token: expoPushToken }).catch((error) => {
            logger.error('Failed to sync push token', error);
          });
        });
      });
    }
  }, [token, expoPushToken]);

  // Set Android status bar background to match the app's cream surface.
  // expo-status-bar doesn't expose backgroundColor — use RN's imperative API.
  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(COLORS.background, false);
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  // Hide splash once both auth is hydrated AND fonts are loaded.
  // .catch() silences the "No native splash screen registered" rejection that fires
  // when hideAsync() is called from a fullScreenModal view controller (e.g. /create).
  useEffect(() => {
    if (hydrated && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [hydrated, fontsLoaded]);

  if (!hydrated || !fontsLoaded) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <GestureHandlerRootView className="flex-1">
        <AppErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <ShareIntentProvider>
                <ToastProvider>
                  <OfflineNotice />
                  <ShareIntentWatcher />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(onboard)" />
                    <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: COLORS.background } }} />
                    <Stack.Screen name="chat/[id]" />
                    <Stack.Screen name="share" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="editor" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="create" options={{ presentation: 'fullScreenModal', animation: 'none' }} />
                    <Stack.Screen name="article" options={{ presentation: 'fullScreenModal', animation: 'none' }} />
                    <Stack.Screen name="settings" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="accept-invite/[id]" />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                </ToastProvider>
              </ShareIntentProvider>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </AppErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

// Only wrap with Sentry when it has been initialised (DSN present).
// Calling Sentry.wrap() before Sentry.init() produces a "App Start Span
// could not be finished" warning and silently breaks tracing.
export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
