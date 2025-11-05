
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    console.log('Login attempt:', { email });

    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Skip email confirmation and use AuthContext signIn directly
      const result = await signIn(email.trim(), password);

      if (!result.success) {
        // If email confirmation is required, show specific message
        if (result.error?.includes('confirm your account') || result.error?.includes('Email not confirmed')) {
          Alert.alert(
            'Email Confirmation Required',
            'Please check your email and click the confirmation link before logging in.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Login Failed', result.error || 'Invalid email or password');
        }
        return;
      }

      console.log('Login successful, routing handled by AuthContext');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <IconSymbol name="heart.fill" size={70} color={colors.secondary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue your journey</Text>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <IconSymbol name="envelope.fill" size={20} color={colors.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(text) => setEmail(text.trim())}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <IconSymbol name="lock.fill" size={20} color={colors.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <IconSymbol
                name={showPassword ? "eye.slash.fill" : "eye.fill"}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Forgot Password */}
          <Pressable style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </Pressable>

          {/* Login Button */}
          <Pressable
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <IconSymbol name="arrow.right" size={20} color={colors.card} />
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up Link */}
          <Pressable
            style={styles.signUpLink}
            onPress={() => router.push('/how-it-works')}
          >
            <Text style={styles.signUpLinkText}>
              Don&apos;t have an account? <Text style={styles.signUpLinkBold}>Sign Up</Text>
            </Text>
          </Pressable>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <IconSymbol name="questionmark.circle.fill" size={20} color={colors.textSecondary} />
          <Text style={styles.helpText}>Need help? Contact support</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)',
    elevation: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  inputIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 4px 12px rgba(63, 81, 181, 0.3)',
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
    boxShadow: 'none',
    elevation: 0,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  signUpLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  signUpLinkText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  signUpLinkBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 16,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
