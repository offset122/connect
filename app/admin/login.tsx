
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { supabase } from "@/app/integrations/supabase/client";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, commonStyles } from "@/styles/commonStyles";
import React, { useState } from "react";
import { IconSymbol } from "@/components/IconSymbol";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 60,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

export default function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting admin login for:', email);

      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth error:', error);
        Alert.alert('Login Failed', error.message);
        return;
      }

      if (data.user) {
        console.log('User authenticated:', data.user.id);

        // Check if user is admin
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_admin, first_name')
          .eq('id', data.user.id)
          .single();

        console.log('User data:', userData);

        if (userError) {
          console.error('Error checking admin status:', userError);
          Alert.alert('Error', 'Failed to verify admin status. Please try again.');
          await supabase.auth.signOut();
          return;
        }

        if (!userData?.is_admin) {
          Alert.alert(
            'Access Denied', 
            'You do not have admin privileges. This login is for administrators only.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await supabase.auth.signOut();
                }
              }
            ]
          );
          return;
        }

        // Admin verified - navigate to dashboard
        console.log('Admin access granted');
        Alert.alert(
          'Welcome Admin',
          `Welcome back, ${userData.first_name || 'Admin'}!`,
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/admin/dashboard')
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <IconSymbol name="lock.shield.fill" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>Admin Login</Text>
        <Text style={styles.subtitle}>
          Access the admin dashboard
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter admin email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Login as Admin</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ This login is for administrators only. Regular users should use the main login screen.
        </Text>
      </View>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back to Welcome Screen</Text>
      </Pressable>
    </SafeAreaView>
  );
}
