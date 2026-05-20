import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from '@/utils/safeRouter';
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";

export default function PrivacyPolicyScreen() {
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <IconSymbol name="lock.shield.fill" size={60} color={colors.primary} />
          </View>

          <Text style={styles.mainTitle}>Privacy Policy</Text>
          <Text style={styles.subtitle}>How we collect, use, and protect your data</Text>

          {/* Company Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="building.2.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Company Information</Text>
            </View>
            <Text style={styles.sectionText}>
              Company: Hanna's Connect{"\n"}
              Trading as: Hanna's Connect
            </Text>
            <Text style={styles.sectionText}>
              At Huppy People Enterprises, your privacy is our priority. This Privacy Policy explains how we collect, use, share, and protect personal data when you interact with our platform. We are committed to complying with the Kenya Data Protection Act, 2019, and related regulations.
            </Text>
          </View>

          {/* Information We Collect */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="doc.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Information We Collect</Text>
            </View>
            <Text style={styles.sectionText}>
              We collect and process the following types of personal data:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Registration Information: Includes username, contact email, gender, relationship preferences, age range, tribe, and general profile preferences." />
              <BulletPoint text="Location Information: You may optionally share your county, constituency, or ward as part of your profile. This helps us localize recommendations." />
              <BulletPoint text="User Content: Profile photos, bio details, and direct messages voluntarily submitted on the platform." />
              <BulletPoint text="Device & Usage Data: Browser type, device model, IP address, location approximations, and usage behavior." />
              <BulletPoint text="Cookies & Tracking: Used to enhance experience, remember settings, and support analytics." />
            </View>
            <Text style={styles.sectionText}>
              Note: We do not request real names, government IDs, or exact geolocation unless legally required.
            </Text>
          </View>

          {/* Lawful Grounds for Data Processing */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="checkmark.shield.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Lawful Grounds for Data Processing</Text>
            </View>
            <Text style={styles.sectionText}>
              We process your personal data under these bases:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Contractual Necessity – To create, manage, and deliver our platform services." />
              <BulletPoint text="Legitimate Interest – To improve features, detect fraud, ensure safety, and analyze user behavior." />
              <BulletPoint text="Consent – For optional services like email updates or future promotional features." />
              <BulletPoint text="Legal Obligation – When compelled by applicable laws or authorities." />
            </View>
          </View>

          {/* How We Use Your Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="gear" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>How We Use Your Information</Text>
            </View>
            <Text style={styles.sectionText}>
              We use your data to:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Operate, secure, and improve the platform" />
              <BulletPoint text="Enable profile matching and content discovery" />
              <BulletPoint text="Communicate service updates or relevant notices" />
              <BulletPoint text="Analyze usage to improve user experience" />
              <BulletPoint text="Investigate abuse or violations of policy" />
              <BulletPoint text="Illustrate platform activity in marketing or product showcases (using anonymized or demo profiles only)" />
            </View>
            <Text style={styles.sectionText}>
              We do not sell your personal information. We may use anonymized and aggregated data (e.g., age range, tribe, goals) for research or service improvements.
            </Text>
          </View>

          {/* Use of Anonymized Data */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="chart.bar.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Use of Anonymized Data</Text>
            </View>
            <Text style={styles.sectionText}>
              We may use anonymized and aggregated profile information for marketing, research, or service improvement purposes. This includes general, non-personal details such as age range, tribe, relationship goals, and preferences. No personal identifiers (e.g., names, emails, phone numbers, or exact locations) will ever be disclosed. By using this platform, you acknowledge and accept this.
            </Text>
          </View>

          {/* Third-Party Services */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="network" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Third-Party Services</Text>
            </View>
            <Text style={styles.sectionText}>
              To operate efficiently, we rely on trusted third parties such as:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Hosting providers" />
              <BulletPoint text="Analytics tools" />
              <BulletPoint text="Authentication or security partners" />
            </View>
            <Text style={styles.sectionText}>
              All partners are under strict confidentiality and data protection terms. We only share what's necessary to provide the service.
            </Text>
          </View>

          {/* Platform Availability */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="clock.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Platform Availability</Text>
            </View>
            <Text style={styles.sectionText}>
              We may conduct system upgrades or maintenance from time to time. During such periods, parts or all of the platform may be temporarily unavailable. We'll notify users where feasible.
            </Text>
          </View>

          {/* Non-Reliance Clause */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Non-Reliance Clause</Text>
            </View>
            <Text style={styles.sectionText}>
              All content and communication on this platform are user-generated and should not be interpreted as professional, legal, or medical advice. Users are solely responsible for their interactions and decisions made from the platform.
            </Text>
          </View>

          {/* Data Retention */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="archivebox.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Data Retention</Text>
            </View>
            <Text style={styles.sectionText}>
              We retain your data only as long as necessary for our services or legal compliance. When no longer needed, it is securely deleted or anonymized.
            </Text>
          </View>

          {/* Data Security */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="lock.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Data Security</Text>
            </View>
            <Text style={styles.sectionText}>
              We implement strong security measures to protect your data from unauthorized access or misuse. While no system is 100% secure, we review and upgrade our protections regularly.
            </Text>
          </View>

          {/* Children's Privacy */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.fill.checkmark" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Children's Privacy</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect is strictly for individuals aged 25 and above. We do not knowingly collect data from persons under this age limit.
            </Text>
          </View>

          {/* Policy Updates */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="pencil.and.outline" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Policy Updates</Text>
            </View>
            <Text style={styles.sectionText}>
              We may revise this policy periodically due to legal, technical, or operational updates. If changes are material, we will notify users. Continued use after updates constitutes acceptance.
            </Text>
          </View>

          {/* Contact Us */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="envelope.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Contact Us</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect{"\n"}
              Email: support@hannasconnect.com
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