import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Give every tab screen enough bottom padding so content clears the floating bar.
        // The bar is ~58px tall + safe area (~34px on modern iPhone) + gap (~16px) ≈ 108px.
        // Using 110 as a comfortable universal value.
        sceneStyle: { paddingBottom: 110 },
      }}
    >
      <Tabs.Screen name="overview" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="stories" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="capsule" />
    </Tabs>
  );
}
