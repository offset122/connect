import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from "@/utils/safeRouter";
import { IconSymbol } from "@/components/IconSymbol";
import {
  colors,
  commonStyles,
  responsiveStyles,
  BREAKPOINTS,
} from "@/styles/commonStyles";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/app/integrations/supabase/client";

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINTS.lg;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { signIn } = useAuth();

  // ✅ Cross-platform alert
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLogin = async () => {
    setErrorMessage("");

    if (!email || !password) {
      showAlert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);

      if (!result.success) {
        let message = "Invalid email or password";

        if (
          result.error?.includes("confirm your account") ||
          result.error?.includes("Email not confirmed")
        ) {
          message =
            "Please check your email and confirm your account before logging in.";
        } else if (
          result.error?.includes("Invalid email or password") ||
          result.error?.includes("invalid_credentials") ||
          result.error?.includes("wrong password")
        ) {
          message =
            "Invalid email or password. Please check your credentials.";
        } else if (result.error) {
          message = result.error;
        }

        // ✅ Inline error (primary UX)
        setErrorMessage(message);

        // ✅ Optional popup (fallback)
        showAlert("Login Failed", message);

        setLoading(false);
        return;
      }

      // ✅ Force refresh session after successful login
      // This ensures any password reset changes are fully recognized
      // and prevents stale session issues
      try {
        await supabase.auth.refreshSession();
      } catch (refreshError) {
        // Ignore refresh errors - main login succeeded
        console.log("Session refresh after login:", refreshError);
      }

      setLoading(false);
    } catch (error: any) {
      const message =
        error.message || "An unexpected error occurred. Try again.";

      setErrorMessage(message);
      showAlert("Login Failed", message);

      setLoading(false);
    }
  };

  const handleBack = () => safeBack(router);

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          responsiveStyles.contentMaxWidth(isLarge),
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <IconSymbol
              name="chevron.left"
              size={isLarge ? 28 : 24}
              color={colors.primary}
            />
          </Pressable>
        </View>

        {/* Logo */}
        <View style={styles.logoWrapper}>
          <View
            style={[styles.logoCircle, responsiveStyles.logoSize(isLarge)]}
          >
            <Image
              source={require("../assets/images/logoh.jpg")}
              style={[styles.logoImage, responsiveStyles.logoSize(isLarge)]}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, responsiveStyles.title(isLarge)]}>
          Welcome Back
        </Text>
        <Text style={[styles.subtitle, responsiveStyles.subtitle(isLarge)]}>
          Sign in to continue your journey
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {/* 🔴 INLINE ERROR */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View
            style={[
              styles.inputContainer,
              responsiveStyles.inputContainer(isLarge),
            ]}
          >
            <View style={styles.inputIconContainer}>
              <IconSymbol
                name="envelope.fill"
                size={isLarge ? 22 : 20}
                color={colors.textSecondary}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(t) => setEmail(t.trim())}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View
            style={[
              styles.inputContainer,
              responsiveStyles.inputContainer(isLarge),
            ]}
          >
            <View style={styles.inputIconContainer}>
              <IconSymbol
                name="lock.fill"
                size={isLarge ? 22 : 20}
                color={colors.textSecondary}
              />
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
                size={isLarge ? 22 : 20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Forgot Password */}
          <Pressable
            style={styles.forgotPassword}
            onPress={() => router.push("/reset-password")}
          >
            <Text
              style={[
                styles.forgotPasswordText,
                responsiveStyles.caption(isLarge),
              ]}
            >
              Forgot Password?
            </Text>
          </Pressable>

          {/* Login Button */}
          <Pressable
            style={[
              styles.loginButton,
              responsiveStyles.button(isLarge),
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Text
                  style={[
                    styles.loginButtonText,
                    { fontSize: isLarge ? 18 : 16 },
                  ]}
                >
                  Sign In
                </Text>
                <IconSymbol
                  name="arrow.right"
                  size={isLarge ? 22 : 20}
                  color={colors.card}
                />
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text
              style={[styles.dividerText, responsiveStyles.caption(isLarge)]}
            >
              OR
            </Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up */}
          <Pressable
            onPress={() => router.push("/how-it-works")}
            style={styles.signUpLink}
          >
            <Text
              style={[styles.signUpLinkText, responsiveStyles.body(isLarge)]}
            >
              Don't have an account?{" "}
              <Text style={styles.signUpLinkBold}>Sign Up</Text>
            </Text>
          </Pressable>
        </View>

        {/* Support */}
        <Pressable
          style={styles.supportButton}
          onPress={() => router.push("/support")}
        >
          <View style={styles.helpSection}>
            <IconSymbol
              name="questionmark.circle.fill"
              size={isLarge ? 22 : 20}
              color={colors.textSecondary}
            />
            <Text
              style={[styles.helpText, responsiveStyles.caption(isLarge)]}
            >
              Need help? Contact support
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },

  header: { marginBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: "center" },

  logoWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  logoImage: { resizeMode: "cover" },

  title: {
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },

  form: { width: "100%" },

  errorBox: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#b71c1c",
    fontWeight: "500",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    elevation: 1,
  },
  inputIconContainer: { marginRight: 12 },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
  },
  eyeIcon: { padding: 8 },

  forgotPassword: { alignSelf: "flex-end", marginBottom: 24 },
  forgotPasswordText: {
    color: colors.primary,
    fontWeight: "600",
  },

  loginButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontWeight: "700",
    color: colors.card,
  },

  buttonDisabled: {
    backgroundColor: colors.disabled,
    elevation: 0,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textSecondary,
  },

  signUpLink: { alignItems: "center", paddingVertical: 12 },
  signUpLinkText: { color: colors.textSecondary },
  signUpLinkBold: { fontWeight: "700", color: colors.primary },

  supportButton: { marginTop: 16 },
  helpSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  helpText: { color: colors.textSecondary },
});