import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const { user, loading, checkUserFlow } = useAuth();

  useEffect(() => {
    // Wait for auth check to complete
    if (loading) return;

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