import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import safeBack from '../utils/safeRouter';
import { colors, commonStyles, responsiveStyles, BREAKPOINTS } from '../styles/commonStyles';
import { IconSymbol } from '../components/IconSymbol';
import { Pressable, useWindowDimensions } from 'react-native';

export default function HowItWorksScreen() {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINTS.lg;

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.content, responsiveStyles.contentMaxWidth(isLarge)]}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => safeBack(router)}>
            <IconSymbol name="chevron.left" size={isLarge ? 28 : 24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, responsiveStyles.title(isLarge)]}>How H.C Works</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.intro}>
            Hanna's Connect is a private, members only dating platform for adults 25 and above who want to connect quietly and intentionally. Here, connection happens on your terms without exposure, without the pressure of the public eye.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership Pricing</Text>
          
          <View style={styles.pricingCard}>
            <Text style={styles.priceAmount}>3,020 KES</Text>
            <Text style={styles.priceDescription}>30 days of unlimited access to singles across Kenya and the diaspora, with 3 guaranteed matches.</Text>
          </View>

          <View style={styles.pricingCard}>
            <Text style={styles.priceAmount}>5,030 KES</Text>
            <Text style={styles.priceDescription}>90 days of unlimited access with 6 guaranteed matches.</Text>
          </View>

          <Text style={styles.guaranteeNote}>
            If you don't reach your guaranteed matches, we renew your membership for free for the same number of days you initially paid for unless we are running a special offer. We reserve a right to change the pricing.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strictly Anonymous</Text>
          <Text style={styles.paragraph}>
            Every member's identity is fully protected. EVERYONE STRICTLY uses an avatar provided as their profile image, and if you choose to upload real photos on your profile, you remain in full control.
          </Text>
          <Text style={styles.paragraph}>
            You will receive a request notification like, "Michael wants to see your photos" — there's also phone number request button. Only the people you personally approve can see your photos and contact you and vice versa. Approve someone, and your inbox opens automatically. Reject someone, and the inbox remains hidden. No approvals, no access.
          </Text>
          <Text style={styles.paragraph}>
            Sometimes, all it takes is one photo leak for that nosey colleague at work to slander you or that relative of yours who hates your mother to start gossiping about you. Here, that never happens.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Matching Works</Text>
          <Text style={styles.paragraph}>
            A match is simple, it happens when you send a connect request and the other member approves it, or when you receive a request and you approve it. That's it. It's a way to start a conversation. Chemistry, of course, is entirely between the two of you.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No Pressure Dating</Text>
          <Text style={styles.paragraph}>
            There's no public browsing, no algorithm pushing people your way, no pressure to perform. You search manually using detailed filters, connecting intentionally with those who are also here for something real. Whether someone is in Kenya or abroad, you can connect freely in the same app at no extra cost.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            Many people want connection, but they want it in private. Hanna's Connect exists to remove the risk of exposure and gossip. Nobody needs to know you're looking. If the person you're looking for is also looking, we simply help you meet quietly, safely, intentionally.
          </Text>
          
          <Text style={styles.tagline}>
            Clarity before chemistry.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
    marginBottom: 12,
  },
  pricingCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  priceDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  guaranteeNote: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 24,
  },
  spacer: {
    height: 40,
  },
});
