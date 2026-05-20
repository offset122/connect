import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from '@/utils/safeRouter';
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";

export default function ChildSafetyStandardsScreen() {
  const handleBack = () => {
    safeBack(router);
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@hannasconnect.com');
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Child Safety Standards</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <IconSymbol name="hand.raised.fill" size={60} color={colors.primary} />
          </View>

          <Text style={styles.mainTitle}>Child Safety Standards</Text>
          <Text style={styles.subtitle}>Our commitment to protecting children</Text>

          {/* Play Store Compliance */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="checkmark.shield.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Play Store Compliance</Text>
            </View>
            <Text style={styles.sectionText}>
              Hanna's Connect is committed to complying with Google's Play Store policies regarding child safety. This app is designed for adults aged 25 and above and includes robust measures to protect minors.
            </Text>
          </View>

          {/* Age Restrictions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="person.fill.xmark" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Age Restrictions</Text>
            </View>
            <Text style={styles.sectionText}>
              Our platform is strictly for individuals aged 25 and above. We do not target, market, or provide services to anyone under this age limit. This policy is strictly enforced through:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Age verification at registration" />
              <BulletPoint text="Profile content that clearly indicates adult audience" />
              <BulletPoint text="No features designed for children or teens" />
              <BulletPoint text="No collection of data from minors" />
            </View>
          </View>

          {/* Prohibited Content */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Prohibited Content</Text>
            </View>
            <Text style={styles.sectionText}>
              We maintain a zero-tolerance policy for content that may harm children. The following is strictly prohibited on our platform:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Any content depicting, describing, or exploiting minors" />
              <BulletPoint text="Child sexual abuse material (CSAM)" />
              <BulletPoint text="Content that sexualizes minors in any way" />
              <BulletPoint text="Grooming or recruitment of minors" />
              <BulletPoint text="Bullying or harassment of minors" />
              <BulletPoint text="Content encouraging self-harm or suicide among minors" />
            </View>
          </View>

          {/* Reporting Mechanism */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="flag.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Reporting Mechanism</Text>
            </View>
            <Text style={styles.sectionText}>
              We provide easy ways for users to report concerning content or behavior:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="In-app reporting buttons on all content" />
              <BulletPoint text="Dedicated support team for safety concerns" />
              <BulletPoint text="Direct email: support@hannasconnect.com" />
              <BulletPoint text="Automatic content moderation systems" />
            </View>
            <Text style={styles.sectionText}>
              All reports are reviewed promptly, and serious violations are reported to relevant authorities.
            </Text>
          </View>

          {/* Data Collection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="lock.shield.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Data Collection</Text>
            </View>
            <Text style={styles.sectionText}>
              We do not collect any personal data from minors. Our data practices include:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="No collection of data from users under 25" />
              <BulletPoint text="No location tracking of minors" />
              <BulletPoint text="No advertising targeted at children" />
              <BulletPoint text="No integration with child-directed services" />
            </View>
          </View>

          {/* Transparency */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="doc.text.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Transparency</Text>
            </View>
            <Text style={styles.sectionText}>
              We are transparent about our safety practices:
            </Text>
            <View style={styles.bulletList}>
              <BulletPoint text="Clear privacy policy detailing data practices" />
              <BulletPoint text="Published safety guidelines for users" />
              <BulletPoint text="Regular safety audits and reviews" />
              <BulletPoint text="Collaboration with safety organizations" />
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="envelope.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Contact Us</Text>
            </View>
            <Text style={styles.sectionText}>
              For any child safety concerns or questions about our policies, please contact us:
            </Text>
            <Text style={styles.contactText}>
              Email: support@hannasconnect.com{"\n"}
              Website: www.hannasconnect.co.ke
            </Text>
            <Pressable onPress={handleContactSupport} style={styles.contactButton}>
              <Text style={styles.contactButtonText}>Contact Support</Text>
            </Pressable>
          </View>

          {/* Last Updated */}
          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>
              Last Updated: April 2026
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
  contactText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
  },
  lastUpdated: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  lastUpdatedText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});