import '../global.css';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Platform, LogBox, StatusBar as RNStatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller';

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
import { QueryClientProvider } from '@tanstack/react-query';
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
import { Geist_400Regular } from '@expo-google-fonts/geist';
import {
  EBGaramond_400Regular,
  EBGaramond_500Medium,
  EBGaramond_700Bold,
} from '@expo-google-fonts/eb-garamond';
import { AzeretMono_400Regular } from '@expo-google-fonts/azeret-mono';
import { PatrickHandSC_400Regular } from '@expo-google-fonts/patrick-hand-sc';
import { Handlee_400Regular } from '@expo-google-fonts/handlee';
import { CutiveMono_400Regular } from '@expo-google-fonts/cutive-mono';
import { useAuthStore, useUiStore } from '@/store';
import { ToastProvider } from '@/components/ui/Toast';
import { OfflineNotice } from '@/components/ui/OfflineNotice';
import { AppErrorBoundary } from '@/components/system/AppErrorBoundary';
import { AuthenticatedNotificationManager } from '@/components/system/AuthenticatedNotificationManager';
import { SheetManager } from '@/components/sheets/SheetManager';
import { COLORS } from '@/constants/tokens';
import { SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE } from '@/lib/env';
import { normalizeAppHref } from '@/lib/navigation';
import { queryClient } from '@/lib/query-client';
import { getSessionReconciliationKey, getSessionRouteAction } from '@/features/auth/session-route-policy';
import { establishSession, terminateSession } from '@/features/auth/session-coordinator';
import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IUser } from '@/types';
import { shouldInitializeNotifications } from '@/features/notifications/work-policy';
import { StatusBar } from 'expo-status-bar';
import { useShareIntentContext, ShareIntentProvider } from 'expo-share-intent';
import { AnimatedSplash } from '@/components/system/AnimatedSplash';

SplashScreen.preventAutoHideAsync();

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    tracesSampleRate: Number.isFinite(SENTRY_TRACES_SAMPLE_RATE) ? SENTRY_TRACES_SAMPLE_RATE : 0.2,
    sendDefaultPii: false,
    // Disable session replay to avoid continuous capture overhead while preserving crash/error reporting.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
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

function SessionBootstrap() {
  const phase = useAuthStore((s) => s.phase);
  const token = useAuthStore((s) => s.token);
  const restoringRef = React.useRef(false);

  useEffect(() => {
    if (phase !== 'authenticating' || !token || restoringRef.current) return;
    restoringRef.current = true;
    queryClient.fetchQuery({
      queryKey: queryKeys.profile,
      queryFn: async () => (await get<IUser>(endpoint.profile)).data,
      staleTime: 0,
    }).then((user) => establishSession(token, user))
      .catch(() => {
        if (useAuthStore.getState().phase === 'authenticating') {
          return terminateSession('restore-failed');
        }
      })
      .finally(() => { restoringRef.current = false; });
  }, [phase, token]);

  return null;
}

function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const phase = useAuthStore((s) => s.phase);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const navigationReady = Boolean(rootNavigationState?.key);
  const reconciliationRef = React.useRef<string | null>(null);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Geist_400Regular,
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    EBGaramond_700Bold,
    AzeretMono_400Regular,
    PatrickHandSC_400Regular,
    Handlee_400Regular,
    CutiveMono_400Regular,

    // Map web font family names directly to React Native loaded fonts
    'Patrick Hand SC': PatrickHandSC_400Regular,
    'Handlee': Handlee_400Regular,
    'Cutive': CutiveMono_400Regular,
    'Portrait Script': require('../assets/fonts/Portrait-script-regular.ttf'),
    'Garamond': EBGaramond_400Regular,
    'Sans': Inter_400Regular,
    'Geist Mono': AzeretMono_400Regular, // kept for capsule theme backward-compat
  });

  // Hydrate auth from SecureStore on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const sessionStable = phase === 'anonymous' || phase === 'authenticated';
    useUiStore.getState().setAppReady(Boolean(rootNavigationState?.key) && sessionStable && Boolean(fontsLoaded));
  }, [rootNavigationState, phase, fontsLoaded]);

  // This is the sole auth-driven navigation owner. Services only transition
  // session state; they never redirect independently.
  useEffect(() => {
    if (!navigationReady) return;
    const ui = useUiStore.getState();
    const snapshot = {
      phase,
      group: segments[0],
      onboardingStatus: user?.onboarding_status ?? null,
      pendingHref: ui.pendingDeepLink,
    };
    const key = getSessionReconciliationKey(snapshot);
    if (reconciliationRef.current === key) return;
    reconciliationRef.current = key;
    const action = getSessionRouteAction(snapshot);
    if (action.type === 'none') return;

    if (action.preserveCurrentHref) {
      const pendingHref = normalizeAppHref(`/${segments.join('/')}`);
      if (pendingHref && segments[0] !== '(auth)' && segments[0] !== '(onboard)') {
        ui.setPendingDeepLink(pendingHref);
      }
    }
    if (action.consumePendingHref) ui.takePendingDeepLink();
    router.replace(action.href);
  }, [navigationReady, phase, user?.onboarding_status, segments, router]);

  // Set Android status bar background to match the app's cream surface.
  // expo-status-bar doesn't expose backgroundColor — use RN's imperative API.
  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(COLORS.background, false);
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  // Hide native splash once both auth is hydrated AND fonts are loaded.
  // The animated splash will take over from here.
  useEffect(() => {
    if ((phase === 'anonymous' || phase === 'authenticated') && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [phase, fontsLoaded]);

  if (!hydrated || !fontsLoaded) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <GestureHandlerRootView className="flex-1">
        <KeyboardProvider preload={false}>
          <AppErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <SessionBootstrap />
              <BottomSheetModalProvider>
              <ShareIntentProvider>
                <ToastProvider>
                  <OfflineNotice />
                  {shouldInitializeNotifications(phase === 'authenticated', Boolean(token)) ? (
                    <AuthenticatedNotificationManager />
                  ) : null}
                  <ShareIntentWatcher />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(onboard)" />
                    <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: COLORS.background } }} />
                    <Stack.Screen name="account" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="insights" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="chat/[id]" />
                    <Stack.Screen name="chat/settings" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="coming-soon" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="share" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="editor" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="create" options={{ presentation: 'fullScreenModal', animation: 'none' }} />
                    <Stack.Screen name="article" options={{ presentation: 'fullScreenModal', animation: 'none' }} />
                    <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="accept-invite/[id]" />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                  <SheetManager />
                </ToastProvider>
              </ShareIntentProvider>
              </BottomSheetModalProvider>
            </QueryClientProvider>
          </AppErrorBoundary>
        </KeyboardProvider>
      </GestureHandlerRootView>
      {showAnimatedSplash && (
        <AnimatedSplash onDone={() => setShowAnimatedSplash(false)} />
      )}
    </SafeAreaProvider>
  );
}

// Only wrap with Sentry when it has been initialised (DSN present).
// Calling Sentry.wrap() before Sentry.init() produces a "App Start Span
// could not be finished" warning and silently breaks tracing.
export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
