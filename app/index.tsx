import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

// Public pages that don't require authentication - used to prevent redirect loops
const PUBLIC_PAGES = [
  'privacy-policy',
  'terms-and-conditions',
  'support',
  'how-it-works',
  'disclaimer',
  'welcome',
  'child-safety-standards',
];

function isPublicPage() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '/';
  return PUBLIC_PAGES.some(page => path.includes(page)) || path === '/' || path === '';
}

export default function IndexScreen() {
  const { user, loading, checkUserFlow } = useAuth();

  useEffect(() => {
    // Wait for auth check to complete
    if (loading) return;

    // If this is a public page, don't redirect to welcome
    if (isPublicPage()) {
      return;
    }

    if (user) {
      // User is authenticated, check their flow status
      checkUserFlow();
    } else {
      // User is not authenticated, show welcome screen
      router.replace('/welcome');
    }
  }, [user, loading, checkUserFlow]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // For public pages, render a simple message while Expo Router handles the route
  if (isPublicPage()) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading page...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // This should not be visible as we immediately redirect
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});