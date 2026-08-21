import '../global.css';

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Platform,
  LogBox,
  StatusBar as RNStatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from 'react-native-reanimated';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Asset } from 'expo-asset';

import * as Sentry from '@sentry/react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { PatrickHandSC_400Regular } from '@expo-google-fonts/patrick-hand-sc';
import { Handlee_400Regular } from '@expo-google-fonts/handlee';
import { CutiveMono_400Regular } from '@expo-google-fonts/cutive-mono';

import { StatusBar } from 'expo-status-bar';
import {
  useShareIntentContext,
  ShareIntentProvider,
} from 'expo-share-intent';

import { useAuthStore, useUiStore } from '@/store';
import { ToastProvider } from '@/components/ui/Toast';
import { OfflineNotice } from '@/components/ui/OfflineNotice';
import { AppErrorBoundary } from '@/components/system/AppErrorBoundary';
import { AuthenticatedNotificationManager } from '@/components/system/AuthenticatedNotificationManager';
import { AnimatedSplash } from '@/components/system/AnimatedSplash';
import { SheetManager } from '@/components/sheets/SheetManager';

import { COLORS } from '@/constants/tokens';
import {
  SENTRY_DSN,
  SENTRY_TRACES_SAMPLE_RATE,
} from '@/lib/env';
import { normalizeAppHref } from '@/lib/navigation';
import { queryClient } from '@/lib/query-client';

import {
  getSessionReconciliationKey,
  getSessionRouteAction,
} from '@/features/auth/session-route-policy';
import {
  establishSession,
  terminateSession,
} from '@/features/auth/session-coordinator';

import { get } from '@/api/mutations';
import endpoint from '@/api/endpoint';
import { queryKeys } from '@/constants/query-keys';
import type { IUser } from '@/types';
import { shouldInitializeNotifications } from '@/features/notifications/work-policy';

// -----------------------------------------------------------------------------
// Reanimated
// -----------------------------------------------------------------------------

// Suppress Reanimated strict-mode "reading from value during render" warnings.
// These come from useSharedValue + direct .value reads in card press handlers
// and don't affect correctness or performance.
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  '[Layout children]',
]);

if (Platform.OS === 'web') {
  (StyleSheet as any).setFlag?.('darkMode', 'class');
}

// -----------------------------------------------------------------------------
// Native splash
// -----------------------------------------------------------------------------

// Keep the native splash visible until we're explicitly ready to replace it
// with the React Native animated splash.
void SplashScreen.preventAutoHideAsync();

// Both assets used by AnimatedSplash should be ready before the native splash
// disappears.
const SPLASH_ASSETS = [
  require('../assets/splash-icon.jpg'),
  require('../assets/images/memento_flat.png'),
];

// -----------------------------------------------------------------------------
// Sentry
// -----------------------------------------------------------------------------

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    tracesSampleRate: Number.isFinite(SENTRY_TRACES_SAMPLE_RATE)
      ? SENTRY_TRACES_SAMPLE_RATE
      : 0.2,
    sendDefaultPii: false,

    // Disable session replay to avoid continuous capture overhead while
    // preserving crash/error reporting.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// -----------------------------------------------------------------------------
// Share intent watcher
// Handles shares while app is already open.
// -----------------------------------------------------------------------------

function ShareIntentWatcher() {
  const { shareIntent } = useShareIntentContext();
  const router = useRouter();

  // Guard against navigating more than once for the same share intent.
  const handledRef = React.useRef(false);

  useEffect(() => {
    if (!shareIntent || handledRef.current) return;

    handledRef.current = true;

    // Give the navigation stack a moment to finish mounting.
    const timeout = setTimeout(() => {
      router.push('/share');
    }, 100);

    return () => clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareIntent]);

  useEffect(() => {
    if (!shareIntent) {
      handledRef.current = false;
    }
  }, [shareIntent]);

  return null;
}

// -----------------------------------------------------------------------------
// Session bootstrap
// Restores an authenticated session from the persisted token.
// -----------------------------------------------------------------------------

function SessionBootstrap() {
  const phase = useAuthStore((state) => state.phase);
  const token = useAuthStore((state) => state.token);

  const restoringRef = React.useRef(false);

  useEffect(() => {
    if (
      phase !== 'authenticating' ||
      !token ||
      restoringRef.current
    ) {
      return;
    }

    restoringRef.current = true;

    queryClient
      .fetchQuery({
        queryKey: queryKeys.profile,
        queryFn: async () =>
          (await get<IUser>(endpoint.profile)).data,
        staleTime: 0,
      })
      .then((user) => establishSession(token, user))
      .catch(() => {
        if (
          useAuthStore.getState().phase ===
          'authenticating'
        ) {
          return terminateSession('restore-failed');
        }
      })
      .finally(() => {
        restoringRef.current = false;
      });
  }, [phase, token]);

  return null;
}

// -----------------------------------------------------------------------------
// Root
// -----------------------------------------------------------------------------

function RootLayout() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const phase = useAuthStore((state) => state.phase);
  const hydrated = useAuthStore((state) => state.hydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  const router = useRouter();
  const segments = useSegments();

  const rootNavigationState = useRootNavigationState();
  const navigationReady = Boolean(
    rootNavigationState?.key,
  );

  const reconciliationRef = React.useRef<
    string | null
  >(null);

  const [showAnimatedSplash, setShowAnimatedSplash] =
    useState(true);

  const [splashAssetsReady, setSplashAssetsReady] =
    useState(false);

  const sessionStable =
    phase === 'anonymous' ||
    phase === 'authenticated';

  // ---------------------------------------------------------------------------
  // Fonts
  // ---------------------------------------------------------------------------

  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,

    PatrickHandSC_400Regular,
    Handlee_400Regular,
    CutiveMono_400Regular,

    // Map web font family names directly to RN loaded fonts.
    'Patrick Hand SC': PatrickHandSC_400Regular,
    Handlee: Handlee_400Regular,
    Cutive: CutiveMono_400Regular,

    'Portrait Script': require(
      '../assets/fonts/Portrait-script-regular.ttf',
    ),

    Garamond: Geist_400Regular,
    Sans: Geist_400Regular,

    // Kept for capsule-theme backward compatibility.
    'Geist Mono': Geist_400Regular,
  });

  // ---------------------------------------------------------------------------
  // Hydrate authentication
  // ---------------------------------------------------------------------------

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ---------------------------------------------------------------------------
  // Warm the splash assets while the native splash is still on screen.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    Asset.loadAsync(SPLASH_ASSETS)
      .catch((error) => {
        // Asset preload failure shouldn't permanently trap the
        // user behind the native splash. Bundled require() may
        // still resolve when AnimatedSplash mounts.
        if (__DEV__) {
          console.warn(
            'Splash asset preload failed:',
            error,
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setSplashAssetsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // App readiness
  // ---------------------------------------------------------------------------

  useEffect(() => {
    useUiStore.getState().setAppReady(
      navigationReady &&
        hydrated &&
        sessionStable &&
        Boolean(fontsLoaded),
    );
  }, [
    navigationReady,
    hydrated,
    sessionStable,
    fontsLoaded,
  ]);

  // ---------------------------------------------------------------------------
  // Auth-driven navigation
  //
  // This remains the sole auth navigation owner.
  // Services transition session state; they don't redirect independently.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!navigationReady) return;

    const ui = useUiStore.getState();

    const snapshot = {
      phase,
      group: segments[0],
      onboardingStatus:
        user?.onboarding_status ?? null,
      pendingHref: ui.pendingDeepLink,
    };

    const key =
      getSessionReconciliationKey(snapshot);

    if (reconciliationRef.current === key) {
      return;
    }

    reconciliationRef.current = key;

    const action = getSessionRouteAction(snapshot);

    if (action.type === 'none') {
      return;
    }

    if (action.preserveCurrentHref) {
      const pendingHref = normalizeAppHref(
        `/${segments.join('/')}`,
      );

      if (
        pendingHref &&
        segments[0] !== '(auth)' &&
        segments[0] !== '(onboard)'
      ) {
        ui.setPendingDeepLink(pendingHref);
      }
    }

    if (action.consumePendingHref) {
      ui.takePendingDeepLink();
    }

    router.replace(action.href);
  }, [
    navigationReady,
    phase,
    user?.onboarding_status,
    segments,
    router,
  ]);

  // ---------------------------------------------------------------------------
  // Android system bar
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(
        COLORS.background,
        false,
      );

      RNStatusBar.setTranslucent(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Native splash -> animated splash handoff
  //
  // Important:
  // AnimatedSplash is mounted first.
  // Then we wait one frame before removing the native splash.
  //
  // This prevents:
  // native splash -> blank frame -> RN splash
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      !hydrated ||
      !fontsLoaded ||
      !splashAssetsReady ||
      !sessionStable
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [
    hydrated,
    fontsLoaded,
    splashAssetsReady,
    sessionStable,
  ]);

  // Keep native splash up while our critical boot resources load.
  //
  // Do NOT include sessionStable here.
  // SessionBootstrap needs to mount during "authenticating"
  // so it can finish restoring the stored session.
  if (!hydrated || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider
      initialMetrics={initialWindowMetrics}
    >
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

                    {shouldInitializeNotifications(
                      phase === 'authenticated',
                      Boolean(token),
                    ) ? (
                      <AuthenticatedNotificationManager />
                    ) : null}

                    <ShareIntentWatcher />

                    <Stack
                      screenOptions={{
                        headerShown: false,
                      }}
                    >
                      <Stack.Screen name="(auth)" />

                      <Stack.Screen name="(onboard)" />

                      <Stack.Screen
                        name="(tabs)"
                        options={{
                          contentStyle: {
                            backgroundColor:
                              COLORS.background,
                          },
                        }}
                      />

                      <Stack.Screen
                        name="account"
                        options={{
                          animation:
                            'slide_from_right',
                        }}
                      />

                      <Stack.Screen
                        name="insights"
                        options={{
                          animation:
                            'slide_from_right',
                        }}
                      />

                      <Stack.Screen name="chat/[id]" />

                      <Stack.Screen
                        name="chat/settings"
                        options={{
                          animation:
                            'slide_from_right',
                        }}
                      />

                      <Stack.Screen
                        name="chat/media"
                        options={{
                          animation:
                            'slide_from_right',
                        }}
                      />

                      <Stack.Screen
                        name="coming-soon"
                        options={{
                          presentation:
                            'fullScreenModal',
                          animation:
                            'slide_from_bottom',
                        }}
                      />

                      <Stack.Screen
                        name="voice-call"
                        options={{
                          presentation:
                            'fullScreenModal',
                          animation:
                            'slide_from_bottom',
                        }}
                      />

                      <Stack.Screen
                        name="share"
                        options={{
                          presentation:
                            'fullScreenModal',
                          animation:
                            'slide_from_bottom',
                        }}
                      />

                      <Stack.Screen
                        name="editor"
                        options={{
                          presentation:
                            'fullScreenModal',
                          animation:
                            'slide_from_bottom',
                        }}
                      />

                      <Stack.Screen
                        name="create"
                        options={{
                          presentation:
                            'fullScreenModal',
                          animation: 'none',
                        }}
                      />

                      <Stack.Screen
                        name="article"
                        options={{
                          presentation:
                            'fullScreenModal',
                          animation: 'none',
                        }}
                      />

                      <Stack.Screen
                        name="settings"
                        options={{
                          animation:
                            'slide_from_right',
                        }}
                      />

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

      {showAnimatedSplash &&
        sessionStable &&
        splashAssetsReady && (
          <AnimatedSplash
            onDone={() => {
              setShowAnimatedSplash(false);
            }}
          />
        )}
    </SafeAreaProvider>
  );
}

// Only wrap with Sentry when it has been initialized.
// Calling Sentry.wrap() before Sentry.init() causes tracing issues.
export default SENTRY_DSN
  ? Sentry.wrap(RootLayout)
  : RootLayout;