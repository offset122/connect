
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Admin Access Button */}
        <Pressable 
          style={styles.adminButton}
          onPress={() => router.push('/admin/login')}
        >
          <IconSymbol name="lock.shield.fill" size={20} color={colors.textSecondary} />
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          {/* Logo Container with Gradient */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <IconSymbol name="heart.fill" size={90} color={colors.secondary} />
            </View>
            <View style={styles.logoGlow} />
          </View>
          
          <Text style={styles.title}>Hanna&apos;s Connect</Text>
          <Text style={styles.tagline}>Find Genuine Connections</Text>
          
          <Text style={styles.description}>
            A modern dating app that helps you find meaningful relationships in a private, 
            respectful, and well-designed environment.
          </Text>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol name="lock.fill" size={28} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>Private</Text>
              <Text style={styles.featureDescription}>Your photos stay hidden until you match</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: colors.secondary + '20' }]}>
                <IconSymbol name="checkmark.seal.fill" size={28} color={colors.secondary} />
              </View>
              <Text style={styles.featureTitle}>Verified</Text>
              <Text style={styles.featureDescription}>All profiles are carefully reviewed</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: colors.accent + '20' }]}>
                <IconSymbol name="heart.fill" size={28} color={colors.accent} />
              </View>
              <Text style={styles.featureTitle}>Genuine</Text>
              <Text style={styles.featureDescription}>Real people seeking real connections</Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: colors.success + '20' }]}>
                <IconSymbol name="shield.checkmark.fill" size={28} color={colors.success} />
              </View>
              <Text style={styles.featureTitle}>Safe</Text>
              <Text style={styles.featureDescription}>Report & block features for your safety</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.primaryButton}
            onPress={() => router.push('/how-it-works')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <IconSymbol name="arrow.right" size={20} color={colors.card} />
          </Pressable>
          
          <Pressable 
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.secondaryButtonText}>I Already Have an Account</Text>
          </Pressable>

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms & Privacy Policy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  adminButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 32,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
    elevation: 8,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.secondary + '30',
    top: -10,
    left: -10,
    zIndex: 1,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 10,
  },
  featureCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 4px 16px rgba(63, 81, 181, 0.3)',
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  termsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
