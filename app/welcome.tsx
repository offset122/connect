import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  useWindowDimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, commonStyles } from "@/styles/commonStyles";

const featureImages = [
  require("../assets/childless.jpg"),
  require("../assets/single moms.jpg"),
  require("../assets/deserving50+.jpg"),
  require("../assets/single dads.jpg"),
];

const featureNames = [
  "Child-less singles",
  "Single moms",
  "Our Deserving 50+",
  "Single dads",
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();

  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 768;
  const isLargeScreen = width >= 768;

  const logoSize = isSmallScreen ? 100 : isMediumScreen ? 120 : 140;
  const iconSize = isSmallScreen ? 70 : isMediumScreen ? 80 : 90;
  const titleFontSize = isSmallScreen ? 28 : isMediumScreen ? 34 : 40;
  const descriptionFontSize = isSmallScreen ? 14 : 16;
  const featureIconContainerSize = isSmallScreen ? 48 : 56;

  const getFeatureCardWidth = () => {
    if (isLargeScreen) return "23%";
    if (width > 500) return "31%";
    return "47%";
  };

  const contentPadding = isSmallScreen ? 16 : 20;
  const verticalSpacing = isSmallScreen ? 20 : isMediumScreen ? 28 : 32;

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={[styles.content, { padding: contentPadding }]}>

            {/* Logo */}
            <View style={[styles.logoContainer, { marginBottom: verticalSpacing }]}>
              <View
                style={[
                  styles.logoCircle,
                  {
                    width: logoSize,
                    height: logoSize,
                    borderRadius: logoSize / 2,
                  },
                ]}
              >
                <Image
                  source={require("../assets/images/logoh.jpg")}
                  style={{
                    width: logoSize,
                    height: logoSize,
                    borderRadius: logoSize / 2,
                  }}
                  resizeMode="cover"
                />
              </View>
              <View
                style={[
                  styles.logoGlow,
                  {
                    width: logoSize + 20,
                    height: logoSize + 20,
                    borderRadius: (logoSize + 20) / 2,
                  },
                ]}
              />
            </View>

            <Text style={[styles.title, { fontSize: titleFontSize }]}>
              Welcome To Hanna&apos;s Connect
            </Text>

            {/* FIXED DESCRIPTION BLOCK */}
            <View
              style={{
                alignItems: "center",
                paddingHorizontal: isSmallScreen ? 16 : 30,
                marginBottom: verticalSpacing,
                width: "100%",
              }}
            >
              <View style={{ width: "100%" }}>
                <Text
                  style={[
                    styles.description,
                    {
                      fontSize: descriptionFontSize,
                      marginBottom: 6,
                    },
                  ]}
                >
                  Connect with like minded individuals.
                </Text>

                <Text
                  style={[
                    styles.description,
                    {
                      fontSize: descriptionFontSize,
                      marginBottom: verticalSpacing / 7,
                    },
                  ]}
                >
                  Clarity before chemistry.
                </Text>

                <Pressable
                  onPress={() => router.push("/how-it-works")}
                  accessibilityRole="button"
                >
                  <Text style={styles.howItWorksLink}>How it works</Text>
                </Pressable>
              </View>
            </View>

            {/* Features */}
            <View style={[styles.featuresGrid, { paddingHorizontal: isSmallScreen ? 0 : 10 }]}>
              {featureImages.map((image, index) => (
                <View key={index} style={[styles.featureCard, { width: getFeatureCardWidth() }]}>
                  <Image
                    source={image}
                    style={[
                      styles.featureImage,
                      {
                        width: featureIconContainerSize * 2.5,
                        height: featureIconContainerSize * 2.5,
                        borderRadius: 20,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.featureTitle,
                      { fontSize: isSmallScreen ? 14 : 16, marginTop: 12 },
                    ]}
                  >
                    {featureNames[index]}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View style={[styles.buttonContainer, { padding: contentPadding }]}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push("/terms-and-conditions")}
            >
              <Text style={[styles.primaryButtonText, { fontSize: isSmallScreen ? 16 : 18 }]}>
                Get Started
              </Text>
              <Text style={[styles.primaryButtonText, { fontSize: isSmallScreen ? 16 : 18 }]}>
                →
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.push("/login")}>
              <Text style={[styles.secondaryButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>
                I Already Have an Account
              </Text>
            </Pressable>

            <Text style={styles.termsText}>
              By continuing, you agree to our{" "}
              <Text
                style={{ color: colors.primary, textDecorationLine: "underline" }}
                onPress={() => router.push("/terms-and-conditions")}
              >
                Terms & Conditions
              </Text>{" "}
              and{" "}
              <Text
                style={{ color: colors.primary, textDecorationLine: "underline" }}
                onPress={() => router.push("/privacy-policy")}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "space-between",
    minHeight: Dimensions.get("window").height - 100,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    position: "relative",
  },
  logoCircle: {
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 2,
    overflow: "hidden",
  },
  logoGlow: {
    position: "absolute",
    backgroundColor: colors.secondary + "30",
    top: -10,
    left: -10,
    zIndex: 1,
  },
  title: {
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },

  /* PERFECT TEXT WRAPPING — NO CUT-OFF */
  description: {
    color: "#000",
    textAlign: "center",
    lineHeight: 24,
    flexShrink: 0,
    flexWrap: "wrap",
    width: "100%",
  },

  howItWorksLink: {
    color: "#1E88E5",
    textDecorationLine: "underline",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 5,
    flexShrink: 0,
    width: "100%",
  },

  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    maxWidth: 1200,
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 140,
  },
  featureImage: {
    resizeMode: "cover",
  },
  featureTitle: {
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  buttonContainer: {
    gap: 12,
    paddingBottom: 8,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontWeight: "700",
    color: colors.card,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontWeight: "600",
    color: colors.primary,
  },
  termsText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
});