import '../global.css';

import React, { useCallback, useEffect, useState } from 'react';
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
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  EBGaramond_400Regular,
  EBGaramond_500Medium,
  EBGaramond_700Bold,
  EBGaramond_400Regular_Italic,
} from '@expo-google-fonts/eb-garamond';
import { AzeretMono_400Regular } from '@expo-google-fonts/azeret-mono';
import { PatrickHandSC_400Regular } from '@expo-google-fonts/patrick-hand-sc';
import { Handlee_400Regular } from '@expo-google-fonts/handlee';
import { CutiveMono_400Regular } from '@expo-google-fonts/cutive-mono';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';

import { StatusBar } from 'expo-status-bar';
import {
  useShareIntentContext,
  ShareIntentProvider,
} from 'expo-share-intent';

import { useAuthStore, useUiStore, useUserStore } from '@/store';
import { ToastProvider } from '@/components/ui/Toast';
import { OfflineNotice } from '@/components/ui/OfflineNotice';
import { AppErrorBoundary } from '@/components/system/AppErrorBoundary';
import { AuthenticatedNotificationManager } from '@/components/system/AuthenticatedNotificationManager';
import { AnimatedSplash } from '@/components/system/AnimatedSplash';
import { SheetManager } from '@/components/sheets/SheetManager';
import { AppSwitcherPrivacyBlur } from '@/components/security/AppSwitcherPrivacyBlur';
import { VaultLockoutScreen } from '@/components/security/VaultLockoutScreen';
import { BackgroundMusicProvider } from '@/hooks/use-background-music';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageKeys } from '@/constants/storage-keys';

import { COLORS } from '@/constants/tokens';
import {
  SENTRY_DSN,
  SENTRY_TRACES_SAMPLE_RATE,
} from '@/lib/env';
import { normalizeAppHref } from '@/lib/navigation';
import { queryClient } from '@/lib/query-client';
import { logger } from '@/lib/logger';

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

// Every cinematic asset should be ready before the native splash disappears.
const SPLASH_ASSETS = [
  require('../assets/images/splash-cinematic/journal.webp'),
  require('../assets/images/splash-cinematic/hug.webp'),
  require('../assets/images/splash-cinematic/typewriter.webp'),
  require('../assets/images/splash-cinematic/phone.webp'),
  require('../assets/images/splash-cinematic/avatar-1.webp'),
  require('../assets/images/splash-cinematic/avatar-2.webp'),
  require('../assets/images/splash-cinematic/avatar-3.webp'),
  require('../assets/images/splash-cinematic/memento_mark.webp'),
  require('../assets/images/backgrounds/welcome_bg.png'),
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
    if (!shareIntent || (!shareIntent.files?.length && !shareIntent.text) || handledRef.current) return;

    handledRef.current = true;

    // Give the navigation stack a moment to finish mounting.
    const timeout = setTimeout(() => {
      router.push('/share');
    }, 100);

    return () => clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareIntent]);

  useEffect(() => {
    if (!shareIntent || (!shareIntent.files?.length && !shareIntent.text)) {
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
      (phase !== 'authenticating' && phase !== 'authenticated') ||
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
      .then(async (user) => {
        const currentPhase = useAuthStore.getState().phase;
        if (currentPhase === 'authenticated') {
          const { syncAuthenticatedUser, reconcilePendingOnboardingSkip } = await import('@/features/auth/session-coordinator');
          const syncedUser = syncAuthenticatedUser(user);
          await reconcilePendingOnboardingSkip(syncedUser);
        } else {
          await establishSession(token, user);
          const { reconcilePendingOnboardingSkip } = await import('@/features/auth/session-coordinator');
          await reconcilePendingOnboardingSkip(user);
        }
      })
      .catch(async (err: any) => {
        const currentPhase = useAuthStore.getState().phase;
        if (currentPhase === 'authenticating' || currentPhase === 'authenticated') {
          const status = err?.status ?? err?.response?.status;
          if (status === 401) {
            return terminateSession('expired');
          }
          // If already authenticated with a cached user and offline, keep the existing session
          if (currentPhase === 'authenticated') {
            return;
          }
          // Non-401 failure during 'authenticating': check for in-memory or persisted user
          const existingUser = useUserStore.getState().user ?? useAuthStore.getState().user;
          if (existingUser) {
            return establishSession(token, existingUser);
          }
          try {
            const { readSessionUser } = await import('@/features/auth/session-credentials');
            const { secureStorage } = await import('@/lib/secure-storage');
            const cachedUser = await readSessionUser(secureStorage);
            if (cachedUser) {
              return establishSession(token, cachedUser);
            }
          } catch {
            // ignore read error
          }
          // Retain authenticated session in offline state rather than wiping user credentials
          useAuthStore.getState().updateCredentials(token);
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
  const terminationReason = useAuthStore((state) => state.terminationReason);

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

  const [splashFinished, setSplashFinished] =
    useState(false);

  const [hasSeenSplash, setHasSeenSplash] =
    useState<boolean | null>(null);

  const hideNativeSplash = useCallback(async () => {
    await SplashScreen.hideAsync().catch(() => { });
  }, []);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(storageKeys.welcomeOnce)
      .then((seen) => {
        if (mounted) {
          setHasSeenSplash(seen === 'true');
        }
      })
      .catch(() => {
        if (mounted) {
          setHasSeenSplash(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const sessionStable =
    phase === 'anonymous' ||
    phase === 'authenticated';

  // ---------------------------------------------------------------------------
  // Fonts
  // ---------------------------------------------------------------------------

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    EBGaramond_700Bold,
    EBGaramond_400Regular_Italic,
    AzeretMono_400Regular,

    PatrickHandSC_400Regular,
    Handlee_400Regular,
    CutiveMono_400Regular,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,

    // Map web font family names directly to RN loaded fonts.
    'Patrick Hand SC': PatrickHandSC_400Regular,
    Handlee: Handlee_400Regular,
    Cutive: CutiveMono_400Regular,
    Geist: Geist_400Regular,

    'Portrait Script': require(
      '../assets/fonts/Portrait-script-regular.ttf',
    ),

    Garamond: EBGaramond_400Regular,
    Sans: Inter_400Regular,

    // Kept for capsule-theme backward compatibility.
    'Geist Mono': AzeretMono_400Regular,
  });

  // ---------------------------------------------------------------------------
  // Hydrate authentication
  // ---------------------------------------------------------------------------

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ---------------------------------------------------------------------------
  // Dismiss the animated splash once the animation/skip finishes AND the session is stable.
  useEffect(() => {
    if (splashFinished && sessionStable) {
      setShowAnimatedSplash(false);
    }
  }, [splashFinished, sessionStable]);

  // Warm the splash assets in the background.
  useEffect(() => {
    Asset.loadAsync(SPLASH_ASSETS).catch((error) => {
      if (__DEV__) {
        logger.warn(
          'Splash asset preload failed:',
          error,
        );
      }
    });
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

    if (
      action.preserveCurrentHref &&
      terminationReason !== 'logout' &&
      terminationReason !== 'deleted'
    ) {
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
    terminationReason,
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

  // Keep native splash up while our critical boot resources load.
  //
  // Do NOT include sessionStable here.
  // SessionBootstrap needs to mount during "authenticating"
  // so it can finish restoring the stored session.
  if (!hydrated || !fontsLoaded || hasSeenSplash === null) {
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
                    <BackgroundMusicProvider>
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
                            gestureEnabled: false,
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

                        <Stack.Screen
                          name="splash-preview"
                          options={{
                            animation: 'none',
                          }}
                        />

                        <Stack.Screen name="accept-invite/[id]" />

                        <Stack.Screen name="+not-found" />
                      </Stack>

                      <SheetManager />
                      <AppSwitcherPrivacyBlur />
                      <VaultLockoutScreen />
                    </BackgroundMusicProvider>
                  </ToastProvider>
                </ShareIntentProvider>
              </BottomSheetModalProvider>
            </QueryClientProvider>
          </AppErrorBoundary>
        </KeyboardProvider>
      </GestureHandlerRootView>

      {showAnimatedSplash && (
        <AnimatedSplash
          replaySpeed={hasSeenSplash === true ? 2 : 1}
          onReady={hideNativeSplash}
          onDone={() => {
            void AsyncStorage.setItem(
              storageKeys.welcomeOnce,
              'true',
            );
            if (sessionStable) {
              setShowAnimatedSplash(false);
            } else {
              setSplashFinished(true);
            }
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
