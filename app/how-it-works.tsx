import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from '@/utils/safeRouter';
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";

export default function HowItWorksScreen() {
  const [understood, setUnderstood] = useState(false);

  const handleContinue = () => {
    router.push('/terms-and-conditions');
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
          <Text style={styles.headerTitle}>How It Works</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.mainTitle}>Welcome to Hanna's Connect</Text>
          <Text style={styles.tagline}>For the grown, the intentional, and the private.</Text>

          <Text style={styles.paragraph}>
            Hanna's Connect is a members only private dating platform for adults 25 and above who want to connect quietly and intentionally.
          </Text>

          <Text style={styles.paragraph}>
            For just 3,000 KES, you get 180 days of UNLIMITED access to singles across Kenya and the diaspora. The fee is non-refundable and non-transferable.
          </Text>

          <Text style={styles.paragraph}>
            There is no public browsing. Only members get to read the profiles of other members. And everyone here is intentionally here.
          </Text>

          <Text style={styles.paragraph}>
            We understand something many won't say out loud, most people desire connection, but they want to seek it in private. Because sometimes, all it takes is your picture being seen publicly to become the next topic of discussion at your workplace, by that one colleague who doesn't like you. Or worse, that cousin who'll screenshot and send it to relatives who already dislike your mother. That's where we come in.
          </Text>

          <Text style={styles.paragraph}>
            Nobody needs to know you're looking. And if the person you're looking for is also looking, we simply help you two meet. You can find or be found intentionally, without necessarily exposing your whole face for the world to see.
          </Text>

          <Text style={styles.paragraph}>
            We provide avatars for each profile. You pick one. That becomes your profile image.
          </Text>

          <Text style={styles.sectionTitle}>Photo Privacy</Text>
          <Text style={styles.paragraph}>
            If you choose to upload real photos, you remain fully in control.
          </Text>
          <Text style={styles.paragraph}>
            Only the people you personally approve can view your photos.
          </Text>
          <Text style={styles.paragraph}>
            No approval, no access.
          </Text>

          <Text style={styles.sectionTitle}>Free Renewal Guarantee</Text>
          <Text style={styles.paragraph}>
            If you do not get five matches within your 180 day membership, we renew you absolutely free.
          </Text>
          <Text style={styles.paragraph}>
            A match means
          </Text>
          <Text style={styles.bulletPoint}>• You sent interest and they approved</Text>
          <Text style={styles.bulletPoint}>• You received interest and you approved.</Text>
          <Text style={styles.paragraph}>
            If you do not reach five, your next 180 days are on us.
          </Text>

          <Text style={styles.paragraph}>
            After reading a profile, you will know whether this is someone worth engaging with even without a photo.
          </Text>

          <Text style={styles.paragraph}>
            If you are interested, you click "I am interested in you." They can accept or decline. If they accept, your inboxes open instantly. If they decline, you receive a respectful email.
          </Text>

          <Text style={styles.paragraph}>
            We do not recommend matches. You search manually using detailed filters. And whether someone is in Kenya or abroad, you connect freely in the same app at no extra cost.
          </Text>

          <Text style={styles.paragraph}>
            This is not a space for performance. It is for people who want something real.
          </Text>

          <Text style={styles.paragraph}>
            Connection does not have to be loud to be meaningful.
          </Text>

          <Text style={styles.paragraph}>
            The ones who move quietly are often the ones ready.
          </Text>

          <Text style={styles.paragraph}>
            And now, so are you.
          </Text>

          <Text style={styles.note}>
            Please note: The 3,000 KES membership fee is non-refundable and non-transferable.
          </Text>

          <Text style={styles.footerTagline}>Hanna's Connect</Text>
          <Text style={styles.footerSlogan}>Clarity before chemistry.</Text>

          {/* Checkbox */}
          <Pressable
            style={styles.checkboxContainer}
            onPress={() => setUnderstood(!understood)}
          >
            <View style={[styles.checkbox, understood && styles.checkboxChecked]}>
              {understood && (
                <IconSymbol name="checkmark" size={16} color={colors.card} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and understand how Hanna's Connect works.
            </Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[
              styles.continueButton,
              !understood && styles.continueButtonDisabled
            ]}
            onPress={understood ? handleContinue : undefined}
            disabled={!understood}
          >
            <Text style={[
              styles.continueButtonText,
              !understood && styles.continueButtonTextDisabled
            ]}>
              Continue to Terms
            </Text>
            <IconSymbol name="arrow.right" size={20} color={understood ? colors.card : colors.textSecondary} />
          </Pressable>
        </View>
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
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  paragraph: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 24,
    marginBottom: 16,
  },
  footerTagline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 24,
  },
  footerSlogan: {
    fontSize: 16,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 3,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
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
  continueButtonDisabled: {
    backgroundColor: colors.border,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
  },
  continueButtonTextDisabled: {
    color: colors.textSecondary,
  },
});