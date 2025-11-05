import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";

export default function EmailConfirmationScreen() {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  const { user } = useLocalSearchParams<{ user?: string }>();

  useEffect(() => {
    // Check if user is authenticated and email confirmed
    checkAuthStatus();

    // Listen for auth state changes (when user clicks email link)
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email_confirmed_at);

      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        // Email is confirmed, proceed to registration
        setIsEmailConfirmed(true);
        console.log('Email verified, redirecting to registration');
        // Don't show alert, just redirect directly
        router.replace('/registration');
      }
    });

    const subscription = data?.subscription;
    return () => subscription?.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('User authenticated:', session.user.email);
        if (session.user.email_confirmed_at) {
          // Email already confirmed, proceed immediately
          setIsEmailConfirmed(true);
          router.replace('/registration');
          return;
        }
      } else {
        console.log('User not authenticated');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    try {
      // Get the current session to get the user's email
      const { data: { session } } = await supabase.auth.getSession();

      // Use the email from route params if available, otherwise fall back to session
      const emailToResend = (user as string) || session?.user?.email;

      if (!emailToResend) {
        throw new Error('No email available to resend confirmation. Please sign up again or contact support.');
      }

      // Use explicit deep link so users return to the app after confirming
      const { data: resendData, error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToResend,
        options: { emailRedirectTo: 'natively://verify-email' }
      });

      if (error) throw error;

      Alert.alert(
        'Email Sent!',
        'A new confirmation email has been sent to your email address. Please check your inbox and click the confirmation link.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error resending confirmation:', error);
      Alert.alert('Error', 'Failed to resend confirmation email: ' + error.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleContinue = () => {
    // Check if email is confirmed before allowing to continue
    const checkAndProceed = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email_confirmed_at) {
          router.replace('/registration');
        } else {
          Alert.alert(
            'Email Not Verified',
            'Please verify your email by clicking the link in your email before continuing.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        Alert.alert('Error', 'Unable to verify email status. Please try again.');
      }
    };

    checkAndProceed();
  };

  const handleLoginInstead = () => {
    router.replace('/login');
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <IconSymbol name="envelope.fill" size={80} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Check Your Email</Text>
          
          {/* Message */}
          <Text style={styles.message}>
            We've sent a confirmation email to your address. Please click the link in the email to verify your account before signing in.
          </Text>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>What to do next:</Text>
            <View style={styles.instructionItem}>
              <View style={styles.bulletPoint} />
              <Text style={styles.instructionText}>
                Check your email inbox (and spam folder)
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.bulletPoint} />
              <Text style={styles.instructionText}>
                Click the confirmation link in the email
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <View style={styles.bulletPoint} />
              <Text style={styles.instructionText}>
                Return to the app and sign in
              </Text>
            </View>
          </View>

          {/* Resend Button */}
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={handleResendConfirmation}
            disabled={resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <IconSymbol name="arrow.clockwise" size={20} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Resend Email</Text>
              </>
            )}
          </Pressable>

          {/* Continue Button */}
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleContinue}
            disabled={isEmailConfirmed}
          >
            <Text style={styles.primaryButtonText}>
              {isEmailConfirmed ? 'Email Verified - Continue' : 'Continue to Registration'}
            </Text>
          </Pressable>

          {/* Login Instead */}
          <Pressable style={styles.loginLink} onPress={handleLoginInstead}>
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  instructions: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 32,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 12,
  },
  instructionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    boxShadow: '0px 4px 12px rgba(63, 81, 181, 0.3)',
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  loginLink: {
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loginLinkBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});