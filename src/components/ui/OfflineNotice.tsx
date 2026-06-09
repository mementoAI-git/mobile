import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OFFLINE_DEBOUNCE_MS = 1500; // wait 1.5s before showing banner (avoids false positives)

export function OfflineNotice() {
  const [isVisible, setIsVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReadyRef = useRef(false); // ref so the listener closure always sees current value

  // Stable callbacks stored in refs so the NetInfo listener never captures a stale closure.
  const showBanner = useCallback(() => {
    setIsVisible(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  }, [translateY]);

  const hideBanner = useCallback(() => {
    // Clear any pending offline timer — we're back online
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsVisible(false));
  }, [translateY]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (!connected) {
      // Debounce: only show after 1.5s of confirmed offline state
      // This prevents false positives from brief network glitches
      if (offlineTimerRef.current) return; // already waiting
      offlineTimerRef.current = setTimeout(() => {
        offlineTimerRef.current = null;
        showBanner();
      }, OFFLINE_DEBOUNCE_MS);
    } else {
      // Back online — hide immediately
      hideBanner();
    }
  }, [showBanner, hideBanner]);

  useEffect(() => {
    // Use fetch() for the real initial state instead of relying on
    // the first listener event (which can fire with false/null before OS settles)
    NetInfo.fetch().then((state) => {
      const connected = state.isConnected ?? true;
      isReadyRef.current = true;
      if (!connected) {
        showBanner();
      }
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!isReadyRef.current) return; // ignore events until initial fetch is done
      handleConnectionChange(state.isConnected ?? true);
    });

    return () => {
      unsubscribe();
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
      }
    };
  }, [showBanner, handleConnectionChange]);


  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          paddingTop: Platform.OS === 'ios' ? insets.top : 10,
        },
      ]}
    >
      <View className="flex-row items-center gap-2 px-4 py-2 bg-text-strong rounded-full">
        <WifiOff size={16} color={COLORS.brand} strokeWidth={2} />
        <Text className="text-white text-xs font-medium" style={{ fontFamily: FONTS.sansMedium }}>
          You're offline. Some features may be limited.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'none',
  },
});
