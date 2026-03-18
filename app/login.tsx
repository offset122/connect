import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from "@/utils/safeRouter";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);

      if (!result.success) {
        if (
          result.error?.includes("confirm your account") ||
          result.error?.includes("Email not confirmed")
        ) {
          Alert.alert(
            "Email Confirmation Required",
            "Please check your email and click the confirmation link before logging in."
          );
        } else {
          Alert.alert(
            "Login Failed",
            result.error || "Invalid email or password"
          );
        }
        setLoading(false);
        return;
      }
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error.message || "An unexpected error occurred"
      );
      setLoading(false);
    }
  };

  const handleBack = () => safeBack(router);

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Logo */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            <Image
              source={require("../assets/images/logoh.jpg")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Sign in to continue your journey
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <IconSymbol
                name="envelope.fill"
                size={20}
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
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <IconSymbol
                name="lock.fill"
                size={20}
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
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Forgot Password */}
          <Pressable
            style={styles.forgotPassword}
            onPress={() => router.push("/reset-password")}
          >
            <Text style={styles.forgotPasswordText}>
              Forgot Password?
            </Text>
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
                <IconSymbol
                  name="arrow.right"
                  size={20}
                  color={colors.card}
                />
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up */}
          <Pressable
            onPress={() => router.push("/how-it-works")}
            style={styles.signUpLink}
          >
            <Text style={styles.signUpLinkText}>
              Don't have an account?{" "}
              <Text style={styles.signUpLinkBold}>Sign Up</Text>
            </Text>
          </Pressable>
        </View>

        {/* Help Section → Support Page */}
        <Pressable
          style={styles.supportButton}
          onPress={() => router.push("/support")}
        >
          <View style={styles.helpSection}>
            <IconSymbol
              name="questionmark.circle.fill"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.helpText}>
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
  content: { padding: 20 },

  header: { marginBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: "center" },

  logoWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  logoImage: { width: 120, height: 120, borderRadius: 60 },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },

  form: { width: "100%" },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
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
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },

  loginButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 18,
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
    fontSize: 14,
    color: colors.textSecondary,
  },

  signUpLink: { alignItems: "center", paddingVertical: 12 },
  signUpLinkText: { fontSize: 16, color: colors.textSecondary },
  signUpLinkBold: { fontWeight: "700", color: colors.primary },

  supportButton: { marginTop: 16 },
  helpSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  helpText: { fontSize: 14, color: colors.textSecondary },
});
