import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="overview" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="stories" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="capsule" />
    </Tabs>
  );
}
