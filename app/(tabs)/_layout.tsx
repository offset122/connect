
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'heart.fill',
      label: 'Members',
    },
    {
      name: 'connections',
      route: '/(tabs)/connections',
      icon: 'person.2.fill',
      label: 'Requests',
      showBadge: true,
      badgeType: 'connections',
    },
    {
      name: 'messages',
      route: '/(tabs)/messages',
      icon: 'message.fill',
      label: 'Inbox',
      showBadge: true,
      badgeType: 'messages',
    },
    
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'person.fill',
      label: 'Profile',
    },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(home)" />
        <Stack.Screen name="connections" />
        <Stack.Screen name="messages" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
