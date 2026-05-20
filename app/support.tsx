import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from '@/utils/safeRouter';
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles, responsiveStyles, BREAKPOINTS } from "@/styles/commonStyles";

export default function SupportScreen() {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINTS.lg;
  
  const handleBack = () => {
    safeBack(router);
  };

  const handleWhatsApp = () => {
    const phoneNumber = "254723438717"; // Hanna's Connect support number
    const url = `https://wa.me/${phoneNumber}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "WhatsApp is not installed on this device");
      }
    });
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Support</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <IconSymbol name="questionmark.circle.fill" size={60} color={colors.primary} />
          </View>

          <Text style={styles.mainTitle}>Need Help?</Text>
          <Text style={styles.subtitle}>We're here to assist you</Text>

          {/* Contact Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="phone.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Contact Support</Text>
            </View>
            <Text style={styles.sectionText}>
              If you need assistance with your account, payments, or have any questions about Hanna's Connect, our support team is ready to help.
            </Text>
          </View>

          {/* WhatsApp Support */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="message.fill" size={24} color={colors.secondary} />
              <Text style={styles.sectionTitle}>WhatsApp Support</Text>
            </View>
            <Text style={styles.sectionText}>
              For quick assistance, chat with us on WhatsApp. We typically respond within a few minutes during business hours.
            </Text>
            <Pressable style={styles.whatsappButton} onPress={handleWhatsApp}>
              <IconSymbol name="message.fill" size={20} color={colors.card} />
              <Text style={styles.whatsappButtonText}>Chat on WhatsApp</Text>
            </Pressable>
          </View>

          {/* Email Support */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="envelope.fill" size={24} color={colors.accent} />
              <Text style={styles.sectionTitle}>Email Support</Text>
            </View>
            <Text style={styles.sectionText}>
              You can also reach us via email for detailed inquiries or technical support.
            </Text>
            <Text style={styles.contactInfo}>
              Email: support@hannasconnect.com
            </Text>
          </View>

          {/* FAQ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="list.bullet" size={24} color={colors.highlight} />
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            </View>
            <Text style={styles.sectionText}>
              Check out our FAQ section for quick answers to common questions about payments, account setup, and platform features.
            </Text>
          </View>

          {/* Response Time */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="clock.fill" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Response Times</Text>
            </View>
            <Text style={styles.sectionText}>
              WhatsApp: Usually within 5-15 minutes during business hours{"\n"}
              Email: Within 24 hours{"\n"}
              Business Hours: Monday - Friday, 9 AM - 6 PM EAT
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
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
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366', // WhatsApp green
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  whatsappButtonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
});