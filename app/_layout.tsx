import '../global.css';
import React, { useEffect } from 'react';
import { StyleSheet, Platform, LogBox } from 'react-native';
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
import { useNotifications } from '@/hooks/use-notifications';
import { COLORS } from '@/constants/tokens';

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

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
  });
}

function RootLayout() {
  const { token, hydrated, hydrate } = useAuthStore();
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
        if (!inAuth) router.replace('/(auth)/login');
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
        router.push(pendingDeepLink as any);
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
          put(endpoint.profile, { push_token: expoPushToken }).catch(console.error);
        });
      });
    }
  }, [token, expoPushToken]);

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
      <GestureHandlerRootView className="flex-1">
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <ToastProvider>
              <OfflineNotice />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(onboard)" />
                <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: COLORS.background } }} />
                <Stack.Screen name="chat/[id]" />
                <Stack.Screen name="editor" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="create" options={{ presentation: 'fullScreenModal', animation: 'none' }} />
                <Stack.Screen name="article" options={{ presentation: 'fullScreenModal', animation: 'none' }} />
                <Stack.Screen name="settings" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="accept-invite/[id]" />
                <Stack.Screen name="+not-found" />
              </Stack>
              {/* SheetManager has moved to app/(tabs)/_layout.tsx so it renders inside
                  a fully-initialised navigation context (required for useRouter() in sheets) */}
            </ToastProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

// Only wrap with Sentry when it has been initialised (DSN present).
// Calling Sentry.wrap() before Sentry.init() produces a "App Start Span
// could not be finished" warning and silently breaks tracing.
export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
