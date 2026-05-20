import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";

export default function DisclaimerScreen() {
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
          <Text style={styles.headerTitle}>Disclaimer</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <IconSymbol name="exclamationmark.triangle.fill" size={60} color={colors.primary} />
          </View>

          <Text style={styles.mainTitle}>Disclaimer</Text>
          <Text style={styles.subtitle}>Important information about using our platform</Text>

          {/* Company Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="building.2.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Company Information</Text>
            </View>
            <Text style={styles.sectionText}>
              Company: Hanna's Connect{"\n"}
              Trading as: Hanna's Connect{"\n"}
              Jurisdiction: Republic of Kenya
            </Text>
          </View>

          {/* Welcome to Hanna's Connect */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="hand.wave.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Welcome to Hanna's Connect</Text>
            </View>
            <Text style={styles.sectionText}>
              Welcome to Hanna's Connect — a community-powered platform designed to connect Kenyans and Africans both locally and globally. We offer a space for members to network, share opportunities, offer services, and grow both professionally and socially in a moderated environment. Please carefully read the following disclaimer before using the platform.
            </Text>
          </View>

          {/* Anonymous Interactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.fill.questionmark" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Anonymous Interactions</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect allows users to interact under pseudonyms or chosen usernames. While we implement safety measures, we do not guarantee the identity, integrity, or intent of users. You are solely responsible for your interactions and should exercise discretion at all times.
            </Text>
          </View>

          {/* Use at Your Own Risk */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="exclamationmark.shield.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Use at Your Own Risk</Text>
            </View>
            <Text style={styles.sectionText}>
              By using Hanna's Connect, you acknowledge that your participation is voluntary and entirely at your own risk. While we offer tools and community standards to reduce harmful behavior, we are not liable for the outcome of any communication, arrangement, or transaction made through the platform.
            </Text>
          </View>

          {/* Age Limitation */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.fill.checkmark" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Age Limitation</Text>
            </View>
            <Text style={styles.sectionText}>
              Use of this platform is strictly limited to individuals who are at the age of 25 and above. By registering, you confirm that you meet this age threshold. We do not knowingly collect or process data from individuals below this requirement, in accordance with Kenya's Data Protection Act.
            </Text>
          </View>

          {/* No Background Checks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="magnifyingglass" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>No Background Checks</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect does not conduct background checks or criminal screenings on any user. It is your sole responsibility to verify any individual or entity you choose to engage with on or outside the platform.
            </Text>
          </View>

          {/* Reporting Misconduct */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="flag.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Reporting Misconduct</Text>
            </View>
            <Text style={styles.sectionText}>
              If you encounter impersonation, fraud, harassment, or other forms of misconduct, report it immediately to support@hannasconnect.com. We take these reports seriously and reserve the right to investigate, suspend, or permanently remove offending accounts without prior notice.
            </Text>
          </View>

          {/* No Guarantee of Matches or Outcomes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="questionmark.circle.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>No Guarantee of Matches or Outcomes</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect provides tools to facilitate interaction and discovery, but we make no guarantees of any particular outcomes—including, but not limited to, personal matches, friendships, employment, partnerships, or services. Any benefits derived are at the user's own effort and discretion.
            </Text>
          </View>

          {/* Third-Party Content and Links */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="link" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Third-Party Content and Links</Text>
            </View>
            <Text style={styles.sectionText}>
              The platform may display links, resources, or embedded content from third parties. These are offered for convenience and informational purposes only. We do not endorse or assume responsibility for the availability, accuracy, or terms of any external platforms.
            </Text>
          </View>

          {/* Use of User Accounts for Platform Illustration and Promotion */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="star.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Use of User Accounts for Platform Illustration and Promotion</Text>
            </View>
            <Text style={styles.sectionText}>
              By registering on Hanna's Connect, you grant us the right to use non-sensitive aspects of your account (e.g., username, profile aesthetics) for platform illustration, feature demonstrations, and general promotion. No private data, communications, or personally identifying information will be exposed without consent.
            </Text>
          </View>

          {/* No Account Sharing */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.2.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>No Account Sharing</Text>
            </View>
            <Text style={styles.sectionText}>
              Accounts on Hanna's Connect are issued for individual use only. Sharing, lending, or unauthorized use of your account is strictly prohibited. If detected, such behavior will result in immediate suspension or permanent banning to protect platform integrity and other users.
            </Text>
          </View>

          {/* Right to Modify or Suspend Services */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="gearshape.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Right to Modify or Suspend Services</Text>
            </View>
            <Text style={styles.sectionText}>
              We reserve the right to make technical, content, or policy updates to the platform at any time without prior notice. During maintenance, the site or app may be temporarily inaccessible. Your continued use of the platform constitutes agreement to these terms, even as they evolve.
            </Text>
          </View>

          {/* No Legal Liability */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="xmark.shield.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>No Legal Liability</Text>
            </View>
            <Text style={styles.sectionText}>
              By using Hanna's Connect, you waive any legal claims or liabilities against the platform, its parent company, or its administrators. This includes—but is not limited to—claims related to user conduct, data use, service interruptions, or third-party content.
            </Text>
          </View>

          {/* Commitment to Data Protection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="lock.shield.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Commitment to Data Protection</Text>
            </View>
            <Text style={styles.sectionText}>
              We protect our platform and data environment in accordance with Kenya's Data Protection Act. All personal information is collected, stored, and handled securely. For further information, refer to our Privacy Policy.
            </Text>
          </View>

          {/* Acceptance of Disclaimer */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="checkmark.seal.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Acceptance of Disclaimer</Text>
            </View>
            <Text style={styles.sectionText}>
              By accessing or using Hanna's Connect, you confirm that you have read, understood, and agree to this Disclaimer in full. If you do not agree, you must cease all use of the platform immediately.
            </Text>
          </View>

          {/* Additional Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="info.circle.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Additional Information</Text>
            </View>
            <View style={styles.bulletList}>
              <BulletPoint text="We may send email notifications to inform you about system upgrades, feature improvements, or important changes to the platform." />
              <BulletPoint text="We may also send promotional or reminder emails to members with incomplete profiles, inactive accounts, or to highlight offers that may improve your chances of connecting with the right person." />
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect does not verify or endorse the personal character, public reputation, or external conduct of any user. While the platform is open to adults seeking meaningful connections, how individual users choose to speak about Hanna's Connect outside the platform is entirely their own. We remain focused on what we stand for privacy, substance, and intentional connections.
            </Text>
            <Text style={styles.sectionText}>
              By using Hanna's Connect, you acknowledge and agree that all interactions, communications, and meetings between members are solely at your own discretion and risk. The founder, employees, and affiliates of Hanna's Connect are not parties to, and shall bear no responsibility or liability for, any relationships, agreements, or exchanges—financial or otherwise—that occur between members.
            </Text>
            <Text style={styles.sectionText}>
              You expressly understand that it is your personal responsibility to exercise caution and perform due diligence before engaging with or meeting any other member in person. Hanna's Connect does not conduct background checks and cannot guarantee the authenticity or intentions of its users.
            </Text>
            <Text style={styles.sectionText}>
              We strongly advise against sending money to any member. Should you choose to do so, you do so entirely at your own risk and Hanna's Connect shall not be held accountable under any circumstances.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
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
});