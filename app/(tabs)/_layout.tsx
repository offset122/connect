
import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  // Define the tabs configuration
  const tabs: TabBarItem[] = [
    {
      name: '(home)',
      route: '/(tabs)/(home)/',
      icon: 'heart.fill',
      label: 'Discover',
    },
    {
      name: 'connections',
      route: '/(tabs)/connections',
      icon: 'person.2.fill',
      label: 'Connections',
    },
    {
      name: 'messages',
      route: '/(tabs)/messages',
      icon: 'message.fill',
      label: 'Messages',
    },
    {
      name: 'notifications',
      route: '/(tabs)/notifications',
      icon: 'bell.fill',
      label: 'Notifications',
      showNotifications: true,
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
