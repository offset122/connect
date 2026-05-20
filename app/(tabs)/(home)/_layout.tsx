import React, { useEffect } from 'react';
import { Stack } from 'expo-router';

export default function HomeLayout() {
  // Removed payment check from here - payment-new.tsx handles post-payment redirect
  // and AuthContext already checks payment on app load

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profileview" options={{ headerShown: false }} />
    </Stack>
  );
}
