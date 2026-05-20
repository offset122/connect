import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Image,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const palette = {
  night:       "#050505",
  nightSoft:   "#0a0a0a",
  nightCard:   "#0c0b0b",
  nightBorder: "#0d0d0e",
  gold:        "#C9A84C",
  goldLight:   "#E8C96A",
  goldDim:     "#8B6E2A",
  slate:       "#1E293B",
  slateMuted:  "#64748B",
  slateDim:    "#94A3B8",
  blush:       "#D4859A",
  sage:        "#7BAF9A",
  ivory:       "#F5F5F0",
  ivoryMuted:  "#A8A8A0",
  ivoryDim:    "#6A6A65",
} as const;

// ─── Static Data ──────────────────────────────────────────────────────────────
const FEATURE_IMAGES = [
  require("../assets/childless.jpg"),
  require("../assets/single moms.jpg"),
  require("../assets/deserving50.jpg"),
  require("../assets/single dads.jpg"),
];

const COMMUNITIES = [
  { name: "Child-less Singles", tag: "No Kids, No Judgement", color: palette.blush },
  { name: "Single Moms",        tag: "Strength & Grace",      color: palette.sage  },
  { name: "Our Deserving 50+",  tag: "Wisdom. Love. Again.",  color: palette.gold  },
  { name: "Single Dads",        tag: "Hearts & Hustle",       color: palette.blush },
] as const;

const PILLARS = [
  { icon: "◈", label: "No Public Browsing", sub: "1. Profiles stay private" },
  { icon: "◉", label: "Three Ways to Connect",  sub: "2. Message, call, or meet" },
  { icon: "◎", label: "Members Only",    sub: "3. Profiles visible to members only" },
  { icon: "◆", label: "Photo Access by Request",      sub: "4. Photo access is granted by request" },
] as const;



// ─── CommunityCard ────────────────────────────────────────────────────────────
function CommunityCard({
  image,
  community,
  index,
}: {
  image: ReturnType<typeof require>;
  community: (typeof COMMUNITIES)[number];
  index: number;
}) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slideX  = useRef(new Animated.Value(36)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(900 + index * 110),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(slideX,  { toValue: 0, duration: 480, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const onPressIn  = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start();
  }, []);
  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1,    tension: 300, friction: 20, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={[styles.communityCard, { opacity, transform: [{ translateX: slideX }, { scale }] }]}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        android_ripple={{ color: "rgba(201,168,76,0.15)" }}
      >
        <View style={styles.communityImageContainer}>
          <Image source={image} style={styles.communityImage} resizeMode="cover" />
          <View style={styles.communityOverlayTop} />
          <View style={styles.communityOverlayBottom} />

          <View style={[styles.communityIndexBadge, { borderColor: community.color }]}>
            <Text style={[styles.communityIndexText, { color: community.color }]}>
              0{index + 1}
            </Text>
          </View>

          <View style={styles.communityLabelBox}>
            <View style={[styles.communityAccentLine, { backgroundColor: community.color }]} />
            <Text style={styles.communityCardName}>{community.name}</Text>
            <Text style={styles.communityCardTag}>{community.tag}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({
  eyebrow,
  title,
  eyebrowColor = palette.slateMuted,
}: {
  eyebrow: string;
  title: string;
  eyebrowColor?: string;
}) {
  return (
    <View style={styles.sectionHeaderWrapper}>
      <View style={styles.sectionLabelRow}>
        <View style={styles.sectionLabelLine} />
        <Text style={[styles.sectionLabelText, { color: eyebrowColor }]}>{eyebrow}</Text>
        <View style={styles.sectionLabelLine} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── StickyBar ────────────────────────────────────────────────────────────────
// Lives OUTSIDE the ScrollView so it's always pinned to the bottom of the screen.
// bottomInset accounts for the iPhone home indicator / Android nav bar via
// useSafeAreaInsets() in the parent.
function StickyBar({ bottomInset }: { bottomInset: number }) {
  const slideY  = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(slideY,  { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const primaryScale = useRef(new Animated.Value(1)).current;
  const onPrimaryIn  = useCallback(() => {
    Animated.spring(primaryScale, { toValue: 0.97, tension: 300, friction: 20, useNativeDriver: true }).start();
  }, []);
  const onPrimaryOut = useCallback(() => {
    Animated.spring(primaryScale, { toValue: 1,    tension: 300, friction: 20, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.stickyBar,
        { paddingBottom: bottomInset + 12, opacity, transform: [{ translateY: slideY }] },
      ]}
    >
      <View style={styles.stickyInner}>
        {/* Primary CTA */}
        <Pressable
          onPressIn={onPrimaryIn}
          onPressOut={onPrimaryOut}
          onPress={() => router.push("/terms-and-conditions")}
          android_ripple={{ color: "rgba(10,10,15,0.2)", borderless: false }}
        >
          <Animated.View style={[styles.primaryBtn, { transform: [{ scale: primaryScale }] }]}>
            <Text style={styles.primaryBtnText}>Create Your Profile</Text>
            <View style={styles.primaryBtnArrow}>
              <Text style={styles.primaryBtnArrowText}>→</Text>
            </View>
          </Animated.View>
        </Pressable>

        {/* Ghost CTA — copy makes both paths explicit */}
        <Pressable
          onPress={() => router.push("/login")}
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
        >
          <Text style={styles.ghostBtnText}>
            Already a member?{"  "}
            <Text style={styles.ghostBtnHighlight}>Sign In</Text>
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── WelcomeScreen ────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const insets    = useSafeAreaInsets();
  const isNarrow  = width < 420;

  // Hero entrance animations
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate  = useRef(new Animated.Value(-6)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY       = useRef(new Animated.Value(22)).current;

  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY       = useRef(new Animated.Value(14)).current;

  const dividerScaleX = useRef(new Animated.Value(0)).current;

  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hintY       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo pop-in
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, tension: 120, friction: 12, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 450,               useNativeDriver: true }),
        Animated.spring(logoRotate,  { toValue: 0, tension: 120, friction: 14,  useNativeDriver: true }),
      ]),
    ]).start();

    // Divider draw
    Animated.sequence([
      Animated.delay(420),
      Animated.timing(dividerScaleX, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    // Tagline
    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 580, useNativeDriver: true }),
        Animated.timing(taglineY,       { toValue: 0, duration: 580, useNativeDriver: true }),
      ]),
    ]).start();

    // Subtitle
    Animated.sequence([
      Animated.delay(580),
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 560, useNativeDriver: true }),
        Animated.timing(subtitleY,       { toValue: 0, duration: 560, useNativeDriver: true }),
      ]),
    ]).start();

    // Scroll-hint pulse loop
    Animated.sequence([
      Animated.delay(1600),
      Animated.loop(
        Animated.sequence([
          Animated.timing(hintOpacity, { toValue: 1,   duration: 600, useNativeDriver: true }),
          Animated.timing(hintY,       { toValue: 7,   duration: 600, useNativeDriver: true }),
          Animated.timing(hintOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(hintY,       { toValue: 0,   duration: 600, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const logoRotateDeg = logoRotate.interpolate({
    inputRange: [-6, 0],
    outputRange: ["-6deg", "0deg"],
  });

  // Padding so the last scroll item clears the sticky bar + safe area
  const STICKY_BAR_HEIGHT  = 118;
  const scrollPaddingBottom = STICKY_BAR_HEIGHT + insets.bottom + 16;

  return (
    // edges={["top"]} — bottom inset is handled manually via useSafeAreaInsets
    // so the sticky bar can sit flush at the very bottom of the screen.
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={palette.night} />

      {/* ── Scrollable content ──────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >

        {/* ══ HERO ════════════════════════════════════════════════ */}
        <View style={[styles.hero, { minHeight: isNarrow ? 620 : 680 }]}>
          <View style={styles.heroGlow} />

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoRing,
              { opacity: logoOpacity, transform: [{ scale: logoScale }, { rotate: logoRotateDeg }] },
            ]}
          >
            <View style={styles.logoInnerRing}>
              <Image
                source={require("../assets/images/logoh.jpg")}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.orbitDot} />
          </Animated.View>

          {/* Brand name */}
          <Animated.Text
            style={[styles.brandName, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}
          >
            Hanna's Connect
          </Animated.Text>

          {/* Gold rule */}
          <Animated.View style={[styles.goldDivider, { transform: [{ scaleX: dividerScaleX }] }]} />

          {/* Headline */}
          <Animated.View
            style={[styles.headlineWrapper, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}
          >
            <Text style={[styles.heroLine1, { fontSize: isNarrow ? 34 : 42 }]}>
              
            </Text>
            <Text style={[styles.heroLine2, { fontSize: isNarrow ? 34 : 42 }]}>
              Clarity before chemistry
            </Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.Text
            style={[styles.heroSub, { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }]}
          >
            Hanna's Connect is a curated platform for corporate and business community.
          </Animated.Text>

          {/* How It Works chip */}
          <Animated.View style={{ opacity: subtitleOpacity }}>
            <Pressable
              onPress={() => router.push("/how-it-works")}
              style={({ pressed }) => [styles.howChip, pressed && { opacity: 0.65 }]}
            >
              <Text style={styles.howChipText}>How It Works</Text>
              <Text style={styles.howChipArrow}> ↗</Text>
            </Pressable>
          </Animated.View>

          {/* Scroll hint */}
          <Animated.View
            style={[styles.scrollHint, { opacity: hintOpacity, transform: [{ translateY: hintY }] }]}
          >
            <View style={styles.scrollHintLine} />
            <Text style={styles.scrollHintText}>scroll</Text>
          </Animated.View>
        </View>

        {/* ══ COMMUNITIES ═════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionHeader eyebrow="COMMUNITIES" title={"Find Your\nPeople Here"} />
          <View style={styles.communityGrid}>
            {FEATURE_IMAGES.map((img, i) => (
              <CommunityCard
                key={i}
                image={img}
                community={COMMUNITIES[i]}
                index={i}
              />
            ))}
          </View>
        </View>

        {/* ══ PILLARS ═════════════════════════════════════════════ */}
        <View style={styles.pillarsSection}>
          <SectionHeader
            eyebrow="WHY US"
            title={"Private by design\nBuilt for professionals"}
            eyebrowColor={palette.gold}
          />
          <View style={styles.pillarsGrid}>
            {PILLARS.map((p, i) => (
              <View key={i} style={styles.pillarCard}>
                <Text style={styles.pillarIcon}>{p.icon}</Text>
                <Text style={styles.pillarLabel}>{p.label}</Text>
                <Text style={styles.pillarSub}>{p.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══ TESTIMONIAL ═════════════════════════════════════════ */}
        <View style={styles.testimonialSection}>
          <Text style={styles.testimonialQuote}>
            {"\u201C"}Don't judge a profile too quickly{"\n"}a profile is only a clue not the{"\n"}full story connect experience the{"\n"}person then decide. Welcome to{"\n"}Hanna's Connect{"\u201D"}
          </Text>
          <View style={styles.testimonialAuthorRow}>
            <View style={styles.testimonialDot} />
            
          </View>
        </View>

        {/* ══ FOOTER ══════════════════════════════════════════════ */}
        {/* Legal lives here — visible when scrolled to bottom, not blocking */}
        <View style={styles.footer}>
          <Text style={styles.footerWordmark}>HC</Text>
          <Text style={styles.footerTagline}>Real People. Real Love.</Text>
          <Text style={styles.legalText}>
            By joining you agree to our{" "}
            <Text style={styles.legalLink} onPress={() => router.push("/terms-and-conditions")}>
              Terms
            </Text>
            {" · "}
            <Text style={styles.legalLink} onPress={() => router.push("/privacy-policy")}>
              Privacy
            </Text>
            {" · "}
            <Text style={styles.legalLink} onPress={() => router.push("/child-safety-standards")}>
              Safety
            </Text>
          </Text>
        </View>

      </ScrollView>

      {/* ── Sticky bar — OUTSIDE ScrollView, always visible ─────── */}
      <StickyBar bottomInset={insets.bottom} />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.night,
  },
  scroll: {
    flex: 1,
    backgroundColor: palette.night,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── HERO ────────────────────────────────────────────────────────
  hero: {
    backgroundColor: palette.night,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 56,
    position: "relative",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: palette.gold,
    opacity: 0.04,
    top: "8%",
    alignSelf: "center",
  },
  logoRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: palette.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
    position: "relative",
  },
  logoInnerRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.goldDim,
  },
  logoImage: {
    width: 104,
    height: 104,
  },
  orbitDot: {
    position: "absolute",
    top: -5,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.gold,
  },
  brandName: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 13,
    letterSpacing: 5,
    color: palette.gold,
    textTransform: "uppercase",
    marginBottom: 18,
    textAlign: "center",
  },
  goldDivider: {
    width: 56,
    height: 1,
    backgroundColor: palette.gold,
    marginBottom: 22,
    alignSelf: "center",
  },
  headlineWrapper: {
    alignItems: "center",
    marginBottom: 18,
  },
  heroLine1: {
    color: palette.ivory,
    fontWeight: "300",
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 50,
  },
  heroLine2: {
    color: palette.gold,
    fontWeight: "700",
    letterSpacing: -1,
    textAlign: "center",
    lineHeight: 50,
  },
  heroSub: {
    fontSize: 15,
    color: palette.ivoryMuted,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "400",
    marginBottom: 28,
    maxWidth: 290,
  },
  howChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: palette.nightBorder,
    borderRadius: 100,
    backgroundColor: palette.nightCard,
    marginBottom: 44,
  },
  howChipText: {
    color: palette.ivoryMuted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  howChipArrow: {
    color: palette.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  scrollHint: {
    alignItems: "center",
    gap: 6,
  },
  scrollHintLine: {
    width: 1,
    height: 26,
    backgroundColor: palette.gold,
    opacity: 0.4,
  },
  scrollHintText: {
    color: palette.gold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    opacity: 0.55,
  },


  // ── COMMUNITIES ─────────────────────────────────────────────────
  section: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 44,
    backgroundColor: palette.night,
  },
  sectionHeaderWrapper: {
    marginBottom: 28,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.nightBorder,
  },
  sectionLabelText: {
    fontSize: 10,
    letterSpacing: 3,
    color: palette.ivoryMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: palette.ivory,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  communityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  communityCard: {
    flex: 1,
    minWidth: 148,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: palette.nightCard,
  },
  communityImageContainer: {
    position: "relative",
    height: 260,
  },
  communityImage: {
    width: "100%",
    height: "100%",
  },
  communityOverlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "rgba(10,10,15,0.35)",
  },
  communityOverlayBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "rgba(10,10,15,0.82)",
  },
  communityIndexBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  communityIndexText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  communityLabelBox: {
    position: "absolute",
    bottom: 16,
    left: 14,
    right: 14,
  },
  communityAccentLine: {
    width: 22,
    height: 2,
    borderRadius: 1,
    marginBottom: 8,
  },
  communityCardName: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.ivory,
    marginBottom: 3,
    lineHeight: 20,
  },
  communityCardTag: {
    fontSize: 11,
    color: palette.ivoryMuted,
    fontWeight: "500",
    letterSpacing: 0.4,
  },

  // ── PILLARS ─────────────────────────────────────────────────────
  pillarsSection: {
    backgroundColor: palette.nightSoft,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 52,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.nightBorder,
  },
  pillarsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pillarCard: {
    width: "47.5%",
    backgroundColor: palette.nightCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.nightBorder,
  },
  pillarIcon: {
    fontSize: 22,
    color: palette.gold,
    marginBottom: 12,
  },
  pillarLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.ivory,
    marginBottom: 5,
    lineHeight: 20,
  },
  pillarSub: {
    fontSize: 12,
    color: palette.ivoryMuted,
    fontWeight: "500",
    lineHeight: 17,
  },

  // ── TESTIMONIAL ─────────────────────────────────────────────────
  testimonialSection: {
    backgroundColor: palette.night,
    paddingHorizontal: 32,
    paddingVertical: 56,
    alignItems: "center",
  },
  testimonialQuote: {
    fontSize: 21,
    fontStyle: "italic",
    color: palette.ivory,
    textAlign: "center",
    lineHeight: 33,
    fontWeight: "300",
    marginBottom: 22,
    letterSpacing: 0.2,
  },
  testimonialAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  testimonialDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.gold,
  },
  testimonialAuthor: {
    fontSize: 11,
    color: palette.gold,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // ── FOOTER ──────────────────────────────────────────────────────
  footer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: palette.nightBorder,
  },
  footerWordmark: {
    fontSize: 20,
    fontWeight: "900",
    color: palette.gold,
    letterSpacing: 4,
  },
  footerTagline: {
    fontSize: 10,
    color: palette.ivoryMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
    opacity: 0.55,
  },
  legalText: {
    fontSize: 11,
    color: palette.ivoryDim,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
  legalLink: {
    color: palette.gold,
    fontWeight: "700",
  },

  // ── STICKY BAR ──────────────────────────────────────────────────
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10,10,15,0.97)",
    borderTopWidth: 1,
    borderTopColor: palette.nightBorder,
  },
  stickyInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.gold,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.night,
    letterSpacing: 0.2,
  },
  primaryBtnArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.night,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnArrowText: {
    fontSize: 13,
    color: palette.gold,
    fontWeight: "700",
  },
  ghostBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.nightBorder,
  },
  ghostBtnPressed: {
    backgroundColor: palette.nightCard,
  },
  ghostBtnText: {
    fontSize: 14,
    color: palette.ivoryMuted,
    fontWeight: "500",
  },
  ghostBtnHighlight: {
    color: palette.ivory,
    fontWeight: "700",
  },
});