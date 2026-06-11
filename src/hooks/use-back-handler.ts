import { useEffect, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Intercepts the Android hardware back button / gesture and calls `onBack` instead
 * of the default behaviour (which exits the app when there's no navigation history).
 *
 * No-op on iOS — iOS only has swipe-back which is already handled by the navigator.
 *
 * Usage:
 *   useBackHandler(handleBack);
 *
 * where `handleBack` typically looks like:
 *   const handleBack = () => { router.canGoBack() ? router.back() : router.replace('/(tabs)/overview'); };
 */
export function useBackHandler(onBack: () => void): void {
  // Stable ref so the BackHandler always calls the latest version of onBack
  const stableOnBack = useCallback(() => {
    onBack();
    return true; // returning true suppresses the default exit behaviour
  }, [onBack]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', stableOnBack);
    return () => subscription.remove();
  }, [stableOnBack]);
}
