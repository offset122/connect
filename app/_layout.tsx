
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/styles/commonStyles';
import 'react-native-reanimated';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="how-it-works" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="terms-and-conditions" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="registration" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="payment" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen 
          name="chat/[id]" 
          options={{ 
            animation: 'slide_from_right',
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="admin/login" 
          options={{ 
            animation: 'slide_from_bottom',
          }} 
        />
        <Stack.Screen 
          name="admin/dashboard" 
          options={{ 
            animation: 'fade',
          }} 
        />
        <Stack.Screen 
          name="admin/user/[id]" 
          options={{ 
            animation: 'slide_from_right',
          }} 
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="formsheet"
          options={{
            presentation: 'formSheet',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="transparent-modal"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
