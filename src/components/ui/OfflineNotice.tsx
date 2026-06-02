import React, { useState, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineNotice() {
  const [isConnected, setIsConnected] = useState(true);
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isConnected) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected]);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateY }],
          paddingTop: Platform.OS === 'ios' ? insets.top : 10 
        }
      ]}
    >
      <View className="flex-row items-center gap-2 px-4 py-2 bg-text-strong rounded-full shadow-lg">
        <WifiOff size={16} color={COLORS.brand} />
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
