import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Linking } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { MessagesProvider } from '@/contexts/MessagesContext';
import { ConnectionsProvider } from '@/contexts/ConnectionsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { NotificationInitializer } from '@/components/NotificationInitializer';
import GlobalNotificationButton from '@/components/GlobalNotificationButton';
import InAppNotificationBanner from '@/components/InAppNotificationBanner';
import FloatingToastBanner from '@/components/FloatingToastBanner';
import 'react-native-reanimated';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function InitialScreen() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const router = useRouter();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Global deep link handler
  useEffect(() => {
    const handleDeepLink = (url: string | null | undefined) => {
      if (!url || typeof url !== 'string') return;
      console.log('Global deep link handler:', url);
      const isCustomScheme = url.startsWith('hannasconnect://');
      const isExpoDev = url.startsWith('exp://') || url.startsWith('expo://');

      if (isCustomScheme && (url.includes('auth/callback') || url.includes('type=recovery'))) {
        console.log('Deep link to auth/callback:', url);
        router.push({ pathname: '/auth/callback', params: { url } });
      } else if (isExpoDev) {
        console.log('Ignoring Expo dev URL:', url);
      }
    };

    Linking.getInitialURL().then(handleDeepLink);

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [router]);

  if (!loaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      {/* Main Flow Screens */}
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="how-it-works" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="terms-and-conditions" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="child-safety-standards" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="signup" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="email-confirmation" options={{ animation: 'fade' }} />
      <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="registration" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="reset-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
      <Stack.Screen name="payment-new" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="photo-gallery" options={{ animation: 'slide_from_right' }} />

      {/* Main App */}
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

      {/* Chat */}
      <Stack.Screen
        name="chat/[id]"
        options={{
          animation: 'slide_from_right',
          presentation: 'card',
        }}
      />

      {/* Connected Profile */}
      <Stack.Screen
        name="connected-profile/[id]"
        options={{
          animation: 'slide_from_right',
          presentation: 'card',
        }}
      />

      {/* Call Screens */}
      <Stack.Screen
        name="call/voice-call"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="call/video-call"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'fullScreenModal',
        }}
      />

      {/* Admin */}
      <Stack.Screen name="admin/login" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="admin/dashboard" options={{ animation: 'fade' }} />
      <Stack.Screen name="admin/user/[id]" options={{ animation: 'slide_from_right' }} />

      {/* Modals */}
      <Stack.Screen
        name="modal"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="formsheet"
        options={{ presentation: 'formSheet', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="transparent-modal"
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MessagesProvider>
          <ConnectionsProvider>
            <ToastProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <NotificationInitializer />
                <StatusBar style="dark" backgroundColor={colors.background} />
                <InitialScreen />
                {/* Floating notification bell (top-right) */}
                <GlobalNotificationButton />
                {/* In-app slide-in banner for foreground notifications */}
                <InAppNotificationBanner />
                {/* Floating toast banner for user actions */}
                <FloatingToastBanner />
              </GestureHandlerRootView>
            </ToastProvider>
          </ConnectionsProvider>
        </MessagesProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
