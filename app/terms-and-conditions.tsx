import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from '@/utils/safeRouter';
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
    safeBack(router);
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

          {/* Company Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="building.2.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Company Information</Text>
            </View>
            <Text style={styles.sectionText}>
              Company Name: Hanna's Connect {"\n"}
              Trading as: Hanna's Connect{"\n"}
              Jurisdiction
            </Text>
          </View>

          {/* Acceptance of Terms */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="checkmark.shield.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
            </View>
            <Text style={styles.sectionText}>
              By accessing or using Hanna's Connect ("the Platform"), you automatically agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not accept these terms, you must not use the Platform.
            </Text>
          </View>

          {/* Eligibility */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.fill.checkmark" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Eligibility</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect is intended strictly for individuals aged twenty-five (25) years and above. By using the Platform, you confirm that you meet this age requirement. We reserve the right to request proof of age and suspend accounts that do not meet this criterion.
            </Text>
          </View>

          {/* Description of Service */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="network" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Description of Service</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect is a secure, community-powered platform designed to connect Kenyans and Africans locally and globally. It allows users to interact, share information, offer services, network socially or professionally, and access local or diaspora-based opportunities in both anonymous and open formats.
            </Text>
          </View>

          {/* User Conduct */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="hand.raised.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>User Conduct</Text>
            </View>
            <Text style={styles.sectionText}>
              Users agree to:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Provide truthful and accurate information during registration." />
              <BulletPoint text="Refrain from sharing or allowing others to access their account." />
              <BulletPoint text="Respect the rights, privacy, and safety of other users." />
              <BulletPoint text="Avoid abusive, fraudulent, unlawful, or exploitative behavior." />
              <BulletPoint text="Abstain from uploading or distributing offensive, explicit, or harmful material." />
              <BulletPoint text="No Sharing of Accounts: Sharing of accounts is strictly prohibited. If detected, involved accounts may be suspended or permanently banned to protect the integrity and security of the Platform." />
            </View>
          </View>

          {/* Use of User Content */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="doc.on.doc.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Use of User Content</Text>
            </View>
            <Text style={styles.sectionText}>
              By uploading or submitting content, you grant Hanna's Connect a royalty-free, non-exclusive, worldwide, and perpetual license to use, reproduce, display, or distribute such content for operational and promotional purposes, provided that such use does not violate your privacy or misrepresent your identity.{"\n\n"}
              We may use anonymized user accounts, profiles, or content solely for marketing or illustrative purposes to promote Hanna's Connect, in compliance with the Kenya Data Protection Act.
            </Text>
          </View>

          {/* Use of Anonymized Data */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="chart.bar.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Use of Anonymized Data</Text>
            </View>
            <Text style={styles.sectionText}>
              We may use anonymized and aggregated profile information for marketing, research, or service improvement purposes. This includes general, non-personal details such as age range, tribe, relationship goals, preferences, and broad location categories (e.g., county or region). No personal identifiers such as names, emails, phone numbers, or exact home addresses will ever be shared or disclosed.{"\n\n"}
              By using this platform, you agree that your anonymized data may be used in this manner.
            </Text>
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="lock.shield.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Privacy</Text>
            </View>
            <Text style={styles.sectionText}>
              Your privacy is our priority. Please refer to our{" "}
              <Text
                style={{ color: colors.primary, textDecorationLine: 'underline' }}
                onPress={() => router.push('/privacy-policy' as any)}
              >
                Privacy Policy
              </Text>{" "}
              for details on how we collect, use, and safeguard your data. Hanna's Connect complies with the Kenya Data Protection Act and relevant regulations.{"\n\n"}
              In the event of a data breach, we will notify affected users and the relevant authorities as required by law and take appropriate action to mitigate the effects.
            </Text>
          </View>

          {/* Payments and Refund Policy */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="creditcard.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Payments and Refund Policy</Text>
            </View>
            <Text style={styles.sectionText}>
              All payments made on the Platform are final. We do not offer refunds once a transaction is completed, including in the case of voluntary account deletion.{"\n\n"}
              By making a payment, you agree to the scope of services provided as outlined on the Platform. You also agree not to dispute valid charges or initiate chargebacks without valid cause. Fraudulent payment activity may lead to account suspension and legal action.
            </Text>
          </View>

          {/* Disclaimers and Limitation of Liability */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.error} />
              <Text style={styles.sectionTitle}>Disclaimers and Limitation of Liability</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect is provided on an "as-is" and "as-available" basis. We do not guarantee uninterrupted access or the accuracy of user-shared information.{"\n\n"}
              We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.{"\n\n"}
              All interactions, communications, and meetings between members are solely at your own discretion and risk. We do not conduct background checks and cannot guarantee the authenticity or intentions of any user.{"\n\n"}
              We strongly advise against sending money to any member. Should you choose to do so, it is entirely at your own risk, and Hanna's Connect shall not be held accountable under any circumstances.{"\n\n"}
              For the full disclaimer, please refer to our{" "}
              <Text
                style={{ color: colors.primary, textDecorationLine: 'underline' }}
                onPress={() => router.push('/disclaimer' as any)}
              >
                Disclaimer
              </Text>{" "}
              page.
            </Text>
          </View>

          {/* User Liability and Indemnification */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="shield.lefthalf.filled" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>User Liability and Indemnification</Text>
            </View>
            <Text style={styles.sectionText}>
              Users shall be held individually responsible for any content they upload or actions they take that result in harm, loss, or legal claims.{"\n\n"}
              You agree to defend, indemnify, and hold harmless Hanna's Connect, its founders, employees, and affiliates from any claims, liabilities, damages, or expenses arising from your use of the Platform or your violation of these Terms.
            </Text>
          </View>

          {/* Modifications to the Terms */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="pencil.and.outline" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Modifications to the Terms</Text>
            </View>
            <Text style={styles.sectionText}>
              We reserve the right to revise, update, or modify these Terms and Conditions at any time without prior notice. Any changes will take effect immediately upon posting on the Platform.{"\n\n"}
              Your continued use of the Platform after such modifications constitutes your acceptance of the new Terms. We encourage you to review the Terms periodically.
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
                How it works
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
