import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS } from '@/constants/tokens';
import { shouldPopTabToTopOnBlur } from '@/features/navigation/tab-reset-policy';

export default function TabsLayout() {
  const COLORS = useThemeColors();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
          // Make React Navigation's tab bar wrapper fully transparent so the floating
          // pill/circle are the only visible elements — no opaque panel behind them.
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
          // Give every tab screen enough bottom padding so content clears the floating bar.
          // backgroundColor matches COLORS.background (#ffffff) for native parity.
          // doesn't show through the paddingBottom zone underneath the floating dock.
          sceneStyle: { paddingBottom: 0, backgroundColor: 'transparent' },
        }}
      >
        <Tabs.Screen name="overview" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen
          name="stories"
          options={{ popToTopOnBlur: shouldPopTabToTopOnBlur('stories') }}
        />
        <Tabs.Screen
          name="explore"
          options={{ popToTopOnBlur: shouldPopTabToTopOnBlur('explore') }}
        />
        <Tabs.Screen name="capsule" options={{ href: null }} />
      </Tabs>

    </View>
  );
}
