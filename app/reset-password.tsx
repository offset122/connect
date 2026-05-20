import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles, responsiveStyles, BREAKPOINTS } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { APP_CONFIG } from "@/constants/config";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  calculatePasswordStrength,
  getAuthErrorMessage,
} from "@/utils/validation";

export default function ResetPasswordScreen() {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= BREAKPOINTS.lg;
  const isLandscape = width > height;

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-redirect to login after password update
  useEffect(() => {
    if (!passwordUpdated) return;

    const countdownInterval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Force a full page reload to clear all cached state
          // This ensures Supabase client re-initializes with fresh state
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          } else {
            router.replace("/login");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [passwordUpdated]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setIsRecoverySession(true);
          setIsResetMode(true);
        }
      } catch (err) {
        console.log("Session init error:", err);
      } finally {
        if (mounted) setInitialCheckDone(true);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  const handleResetPassword = async () => {
    setErrorMessage(null);

    if (isResetMode && isRecoverySession) {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        setErrorMessage(passwordValidation.error || "Invalid password");
        return;
      }
      const matchValidation = validatePasswordMatch(newPassword, confirmPassword);
      if (!matchValidation.isValid) {
        setErrorMessage(matchValidation.error || "Passwords do not match");
        return;
      }

      setLoading(true);
      try {
        // Update the password
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        
        // Force refresh the session to ensure new password is active
        // This prevents the "need to refresh site" issue
        await supabase.auth.refreshSession();
        
        // Completely clear all Supabase session data from localStorage
        // This ensures no stale tokens remain
        if (typeof window !== 'undefined' && window.localStorage) {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('sb-') || key === 'sb-access-token' || key === 'sb-refresh-token')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          console.log('Cleared Supabase localStorage keys:', keysToRemove);
        }
        
        // Now sign out to clear the session
        await supabase.auth.signOut();
        
        setPasswordUpdated(true);
      } catch (error: any) {
        setErrorMessage(getAuthErrorMessage(error));
      } finally {
        setLoading(false);
      }
    } else {
      const emailValidation = validateEmail(email.trim());
      if (!emailValidation.isValid) {
        setErrorMessage(emailValidation.error || "Invalid email");
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: Platform.OS === "web"
            ? APP_CONFIG.DEEP_LINKS.SUPABASE_REDIRECT
            : APP_CONFIG.DEEP_LINKS.SUPABASE_REDIRECT_MOBILE,
        });
        if (error) throw error;
        setEmailSent(true);
      } catch (error: any) {
        setErrorMessage(getAuthErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }
  };

  const passwordStrength = calculatePasswordStrength(newPassword);
  const showStrengthMeter = isResetMode && newPassword.length > 0;

  const isButtonDisabled = () => {
    if (loading) return true;
    if (isResetMode) {
      return !(newPassword.length >= APP_CONFIG.PASSWORD_MIN_LENGTH && newPassword === confirmPassword);
    }
    return email.trim().length === 0;
  };

  if (!initialCheckDone) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[
          styles.content, 
          isLargeScreen && styles.contentLarge
        ]} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.mainWrapper, isLargeScreen && styles.mainWrapperLarge]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={isLargeScreen ? 28 : 24} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.logoWrapper}>
            <View style={[styles.logoCircle, isLargeScreen && styles.logoCircleLarge]}>
              <Image source={require("../assets/images/logoh.jpg")} style={[styles.logoImage, isLargeScreen && styles.logoImageLarge]} resizeMode="cover" />
            </View>
          </View>

        {/* Inline error banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <IconSymbol name="exclamationmark.circle.fill" size={18} color={colors.error} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {isResetMode ? (
          passwordUpdated ? (
            <View style={styles.successCard}>
              <View style={[styles.iconCircle, { backgroundColor: colors.success + "22" }]}>
                <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
              </View>
              <Text style={styles.title}>Password Updated!</Text>
              <Text style={styles.subtitle}>Your password has been reset successfully.</Text>
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>Redirecting to login in </Text>
                <Text style={styles.countdownNumber}>{redirectCountdown}</Text>
                <Text style={styles.countdownText}> seconds...</Text>
              </View>
              <Pressable style={styles.actionButton} onPress={() => {
                // Force a full page reload to ensure fresh session state
                if (typeof window !== 'undefined') {
                  window.location.href = '/login';
                } else {
                  router.replace("/login");
                }
              }}>
                <Text style={styles.actionButtonText}>Sign In Now</Text>
                <IconSymbol name="arrow.right" size={20} color={colors.card} />
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Set New Password</Text>
              <Text style={styles.subtitle}>Create a strong password to secure your account</Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <IconSymbol name="lock.fill" size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor={colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <Pressable style={styles.eyeIcon} onPress={() => setShowNewPassword(!showNewPassword)}>
                    <IconSymbol name={showNewPassword ? "eye.slash.fill" : "eye.fill"} size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {showStrengthMeter && (
                  <View style={styles.strengthRow}>
                    <View style={[styles.strengthBar, { backgroundColor: passwordStrength.color, flex: passwordStrength.score }]} />
                    <View style={[styles.strengthBar, { backgroundColor: colors.border, flex: 4 - passwordStrength.score }]} />
                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <IconSymbol name="lock.fill" size={20} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <Pressable style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <IconSymbol name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"} size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {confirmPassword.length > 0 && (
                  <Text style={[styles.matchHint, { color: newPassword === confirmPassword ? colors.success : colors.error }]}>
                    {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </Text>
                )}

                <Pressable
                  style={[styles.actionButton, isButtonDisabled() && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isButtonDisabled()}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.card} />
                  ) : (
                    <>
                      <Text style={styles.actionButtonText}>Update Password</Text>
                      <IconSymbol name="arrow.right" size={20} color={colors.card} />
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )
        ) : emailSent ? (
          <View style={styles.successCard}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight + "22" }]}>
              <IconSymbol name="envelope.fill" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>We've sent a reset link to</Text>
            <Text style={styles.emailHighlight}>{email}</Text>
            <Text style={styles.hintText}>Didn't receive it? Check your spam folder or try again.</Text>
            <Pressable style={styles.outlineButton} onPress={() => setEmailSent(false)}>
              <Text style={styles.outlineButtonText}>Try a different email</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>

            <View style={styles.form}>
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
                />
              </View>

              <Pressable
                style={[styles.actionButton, isButtonDisabled() && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={isButtonDisabled()}
              >
                {loading ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>Send Reset Link</Text>
                    <IconSymbol name="arrow.right" size={20} color={colors.card} />
                  </>
                )}
              </Pressable>

              <Pressable style={styles.backToLogin} onPress={() => router.replace("/login")}>
                <Text style={styles.backToLoginText}>
                  Remember your password?{" "}
                  <Text style={styles.backToLoginBold}>Sign In</Text>
                </Text>
              </Pressable>
            </View>
          </>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 40 },
  contentLarge: { paddingHorizontal: 40, paddingBottom: 60 },

  mainWrapper: { width: '100%' },
  mainWrapperLarge: { maxWidth: 500, alignSelf: 'center' },

  header: { marginBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: "center" },

  logoWrapper: { justifyContent: "center", alignItems: "center", marginBottom: 30 },
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.card, justifyContent: "center", alignItems: "center", elevation: 6,
  },
  logoCircleLarge: {
    width: 150, height: 150, borderRadius: 75,
  },
  logoImage: { width: 120, height: 120, borderRadius: 60 },
  logoImageLarge: { width: 150, height: 150, borderRadius: 75 },

  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.error + "15", borderWidth: 1, borderColor: colors.error + "40",
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorBannerText: { flex: 1, fontSize: 14, color: colors.error },

  title: { fontSize: 32, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: "center", marginBottom: 32 },

  form: { width: "100%" },

  inputContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, elevation: 1,
  },
  inputIconContainer: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: colors.text },
  eyeIcon: { padding: 8 },

  strengthRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: -8, marginBottom: 16 },
  strengthBar: { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "600", marginLeft: 8, minWidth: 50 },

  matchHint: { fontSize: 13, marginTop: -8, marginBottom: 12, marginLeft: 4 },

  actionButton: {
    flexDirection: "row", backgroundColor: colors.primary,
    paddingVertical: 16, borderRadius: 12, alignItems: "center",
    justifyContent: "center", gap: 8, elevation: 4, marginTop: 8,
  },
  actionButtonText: { fontSize: 18, fontWeight: "700", color: colors.card },
  buttonDisabled: { backgroundColor: colors.disabled, elevation: 0 },

  backToLogin: { alignItems: "center", paddingVertical: 20 },
  backToLoginText: { fontSize: 16, color: colors.textSecondary },
  backToLoginBold: { fontWeight: "700", color: colors.primary },

  successCard: { alignItems: "center", paddingTop: 8 },
  countdownContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  countdownText: { fontSize: 14, color: colors.textSecondary },
  countdownNumber: { fontSize: 14, fontWeight: "700", color: colors.primary },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: "center", alignItems: "center", marginBottom: 24,
  },
  emailHighlight: { fontSize: 16, fontWeight: "700", color: colors.primary, marginBottom: 16, textAlign: "center" },
  hintText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: 32, lineHeight: 22 },
  outlineButton: { borderWidth: 2, borderColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  outlineButtonText: { fontSize: 16, fontWeight: "600", color: colors.primary },
});
