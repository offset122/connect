
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";

export default function TermsAndConditionsScreen() {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const handleContinue = () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      Alert.alert(
        'Agreement Required',
        'Please accept both the Terms & Conditions and Privacy Policy to continue.'
      );
      return;
    }
    
    console.log('Terms accepted, proceeding to signup');
    router.push('/signup');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Terms & Privacy</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <IconSymbol name="doc.text.fill" size={60} color={colors.primary} />
          </View>

          <Text style={styles.mainTitle}>Terms & Conditions</Text>
          <Text style={styles.subtitle}>Please read and accept our terms to continue</Text>

          {/* Terms Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="checkmark.shield.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>User Agreement</Text>
            </View>
            <Text style={styles.sectionText}>
              By using Hanna&apos;s Connect, you agree to:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Be respectful and genuine in all interactions" />
              <BulletPoint text="Provide accurate information in your profile" />
              <BulletPoint text="Not share inappropriate or offensive content" />
              <BulletPoint text="Respect other users&apos; privacy and boundaries" />
              <BulletPoint text="Not use the app for commercial purposes" />
            </View>
          </View>

          {/* Subscription Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="creditcard.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Subscription Details</Text>
            </View>
            <View style={styles.bulletList}>
              <BulletPoint text="Account valid for 180 days from payment" />
              <BulletPoint text="One-time payment of 3,000 KSH required" />
              <BulletPoint text="Automatic renewal if you have less than 3 matches" />
              <BulletPoint text="No refunds after profile completion" />
            </View>
          </View>

          {/* Privacy Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="lock.shield.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Privacy & Security</Text>
            </View>
            <View style={styles.bulletList}>
              <BulletPoint text="Profile photos hidden until mutual connection" />
              <BulletPoint text="You control your online status visibility" />
              <BulletPoint text="Your data is encrypted and secure" />
              <BulletPoint text="We never share your information with third parties" />
              <BulletPoint text="You can delete your account at any time" />
            </View>
          </View>

          {/* Safety Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Safety Guidelines</Text>
            </View>
            <View style={styles.bulletList}>
              <BulletPoint text="Report any inappropriate behavior immediately" />
              <BulletPoint text="Never share financial information with other users" />
              <BulletPoint text="Meet in public places for first dates" />
              <BulletPoint text="Trust your instincts and stay safe" />
            </View>
          </View>

          {/* Account Management */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.crop.circle.badge.xmark" size={24} color={colors.error} />
              <Text style={styles.sectionTitle}>Account Termination</Text>
            </View>
            <Text style={styles.sectionText}>
              We reserve the right to suspend or terminate accounts that violate our terms, 
              engage in harassment, or misuse the platform. Serious violations may result in 
              permanent bans without refund.
            </Text>
          </View>

          {/* Acceptance Checkboxes */}
          <View style={styles.acceptanceContainer}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && (
                  <IconSymbol name="checkmark" size={18} color={colors.card} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the Terms & Conditions
              </Text>
            </Pressable>

            <Pressable
              style={styles.checkboxRow}
              onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
            >
              <View style={[styles.checkbox, acceptedPrivacy && styles.checkboxChecked]}>
                {acceptedPrivacy && (
                  <IconSymbol name="checkmark" size={18} color={colors.card} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                I accept the Privacy Policy
              </Text>
            </Pressable>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.continueButton,
              (!acceptedTerms || !acceptedPrivacy) && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!acceptedTerms || !acceptedPrivacy}
          >
            <Text style={styles.continueButtonText}>Continue to Sign Up</Text>
            <IconSymbol name="arrow.right" size={20} color={colors.card} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={styles.bulletItem}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  mainTitle: {
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
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  sectionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    gap: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  acceptanceContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
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
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
    boxShadow: 'none',
    elevation: 0,
  },
});
