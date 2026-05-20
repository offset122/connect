// PaymentScreen.tsx — Enhanced Modern UI
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from "../utils/safeRouter";
import { IconSymbol } from "../components/IconSymbol";
import { colors, commonStyles, responsiveStyles, BREAKPOINTS } from "../styles/commonStyles";
import { supabase } from "./integrations/supabase/client";
import PaystackService from "./integrations/paystack/service";
import APP_CONFIG from "../constants/config";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const PALETTE = {
  // Primary brand — deep teal/emerald
  brand:        "#0A7B5C",
  brandLight:   "#0EA574",
  brandSoft:    "#E8F7F2",
  brandMuted:   "#C2E8DA",

  // Accent — warm gold
  gold:         "#D4971A",
  goldLight:    "#FFF3D4",

  // Neutrals
  ink:          "#0F1923",
  inkMid:       "#3A4A5A",
  inkSoft:      "#7A8FA0",
  inkFaint:     "#C4D0D9",
  surface:      "#FFFFFF",
  surfaceAlt:   "#F3F8F6",
  divider:      "#E2EBE7",

  // Status
  success:      "#0DAF6A",
  successSoft:  "#E3FAF0",
  error:        "#E53E5A",
  errorSoft:    "#FEE8EC",
  warning:      "#F5A623",
};

const FONT = {
  display:  Platform.OS === "ios" ? "Georgia" : "serif",
  body:     Platform.OS === "ios" ? "System" : "sans-serif",
  mono:     Platform.OS === "ios" ? "Courier New" : "monospace",
};

// ─── Plan Config ──────────────────────────────────────────────────────────────
const PLANS = {
  "180": {
    amount: 3020,
    duration: 30,
    months: 1,
    label: "1 Month",
    sublabel: "30 days full access",
    badge: null,
    perDay: Math.round(3020 / 30),
  },
  "365": {
    amount: 5030,
    duration: 90,
    months: 3,
    label: "3 Months",
    sublabel: "90 days full access",
    badge: "Most Popular",
    perDay: Math.round(5030 / 90),
  },
} as const;

const DEFAULT_PLAN = "180" as keyof typeof PLANS;

const FEATURES = [
  { icon: "message.fill",          label: "Private Messaging" },
  { icon: "person.2.fill",         label: "Unlimited Connections" },
  { icon: "video.fill",            label: "Video & Voice Calls" },
];

const VERIFY_CALLBACK_BASE =
  "https://dbvsexpcrojtnriqfbwa.supabase.co/functions/v1/verify-payment";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS  = 60_000;

// ─── Animated Dot Loader ──────────────────────────────────────────────────────
function PulsingDot({ delay = 0 }: { delay?: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(anim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{
        width: 7, height: 7, borderRadius: 4,
        backgroundColor: PALETTE.brand,
        opacity: anim,
        marginHorizontal: 3,
      }}
    />
  );
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────
function ProgressSteps({ step }: { step: number }) {
  const steps = ["Choose Plan", "Enter Number", "Confirm"];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <View style={{ alignItems: "center", flex: 1 }}>
            <View style={[
              progStyles.circle,
              i < step  && progStyles.done,
              i === step && progStyles.active,
            ]}>
              {i < step
                ? <IconSymbol name="checkmark" size={12} color={colors.card} />
                : <Text style={[progStyles.num, i === step && { color: colors.card }]}>{i + 1}</Text>
              }
            </View>
            <Text style={[progStyles.label, i === step && { color: colors.primary, fontWeight: "600" }]}>{s}</Text>
          </View>
          {i < steps.length - 1 && (
            <View style={[progStyles.line, i < step && { backgroundColor: colors.primary }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const progStyles = StyleSheet.create({
  circle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.card,
  },
  done:   { backgroundColor: colors.primary, borderColor: colors.primary },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  num:    { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  label:  { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
  line:   { flex: 1, height: 2, backgroundColor: colors.border, marginBottom: 16 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PaymentScreen() {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINTS.lg;
  const isSmall = width < BREAKPOINTS.sm;
  const sp = (n: number) => n * (isSmall ? 8 : isLarge ? 12 : 10);

  const [phoneNumber,      setPhoneNumber]      = useState("");
  const [userId,           setUserId]           = useState<string | null>(null);
  const [paymentStatus,    setPaymentStatus]    = useState<"idle"|"initiated"|"pending"|"completed"|"failed">("idle");
  const [loading,          setLoading]          = useState(false);
  const [checkoutReference,setCheckoutReference]= useState<string | null>(null);
  const [polling,          setPolling]          = useState(false);
  const [showRefreshPopup, setShowRefreshPopup] = useState(false);
  const [selectedPlan,     setSelectedPlan]     = useState<keyof typeof PLANS>(DEFAULT_PLAN);

  const pollRef        = useRef<number | null>(null);
  const pollStartedAt  = useRef<number | null>(null);
  const scrollRef      = useRef<ScrollView | null>(null);
  const phoneInputRef  = useRef<TextInput | null>(null);
  const mountedRef     = useRef(true);

  // Animated values for plan selection
  const planAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const refreshUserProfile = useCallback(async (authUserId?: string | null) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authUserId ? { id: authUserId } : authData?.user;
      if (!authUser) return null;

      const { data: byAuth } = await supabase
        .from("users").select("*").eq("auth_id", authUser.id).maybeSingle();
      if (byAuth) return byAuth;

      const email = authData?.user?.email;
      if (!email) return null;
      const { data: byEmail } = await supabase
        .from("users").select("*").eq("email", email).maybeSingle();
      if (!byEmail) return null;

      if (!byEmail.auth_id) {
        await supabase.from("users")
          .update({ auth_id: authUser.id, updated_at: new Date().toISOString() })
          .eq("email", email);
        byEmail.auth_id = authUser.id;
      }
      return byEmail;
    } catch (err) {
      console.warn("refreshUserProfile:", err);
      return null;
    }
  }, []);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!APP_CONFIG.FEATURES.REQUIRE_PAYMENT) {
          if (mounted) router.replace("/registration");
          return;
        }
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) Alert.alert("Not logged in", "Please sign in to continue.", [
            { text: "OK", onPress: () => router.replace("/login") },
          ]);
          return;
        }
        if (mounted) setUserId(user.id);
        const profile = await refreshUserProfile(user.id);
        if (!profile) {
          Alert.alert("Profile not found", "Please complete registration before paying.", [
            { text: "Go to Registration", onPress: () => router.replace("/registration") },
          ]);
          return;
        }
        const p = profile as any;
        if (p.has_paid || p.payment_status === "completed") {
          console.log("[Payment] User has already paid");
        }
      } catch (err) { console.error("Initial user check error:", err); }
    })();
    return () => { mounted = false; };
  }, [refreshUserProfile]);

  // ── Deep link ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleUrl = (event: { url?: string } | null | undefined) => {
      try {
        if (!event || typeof event.url !== "string") return;
        const url = event.url;
        if (!url.startsWith("hannasconnect://") && !url.startsWith("https://")) return;
        const u = new URL(url);
        const reference = u.searchParams.get("reference") || u.searchParams.get("tx_ref");
        if (reference) verifyReferenceAndRedirect(reference);
      } catch (e) { console.warn("Failed to parse incoming URL", e); }
    };
    const sub = Linking.addEventListener("url", handleUrl);
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) handleUrl({ url: initial });
    })();
    return () => sub.remove();
  }, []);

  // ── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    let unsub: any = null;
    const start = async () => {
      try {
        unsub = await PaystackService.subscribeToPaymentUpdates(userId, async (evt: any) => {
          const ref = evt.transaction_id || evt.reference || null;
          if (ref) setCheckoutReference(ref);
          if (evt.status === "completed" || evt.payment_completed === true) {
            stopPolling(); setPaymentStatus("completed"); setLoading(false); setShowRefreshPopup(false);
            const profile = await refreshUserProfile(userId);
            if (profile) {
              if (!profile.first_name || !profile.age) router.replace("/registration");
              else router.replace("/(tabs)/(home)");
            } else router.replace("/registration");
          } else if (evt.status === "failed") {
            stopPolling(); setPaymentStatus("failed"); setLoading(false); setShowRefreshPopup(false);
            Alert.alert("Payment failed", "Please try again.");
          }
        });
      } catch (err) { console.warn("subscribeToPaymentUpdates failed", err); }
    };
    start();
    return () => {
      if (unsub?.unsubscribe) unsub.unsubscribe();
      if (typeof unsub === "function") unsub();
    };
  }, [userId, refreshUserProfile]);

  // ── Polling ───────────────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollRef.current || !userId) return;
    pollStartedAt.current = Date.now();
    setPolling(true); setPaymentStatus("pending");

    pollRef.current = setInterval(async () => {
      if (!userId || !mountedRef.current) return;
      if (pollStartedAt.current && Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS) {
        stopPolling(); setShowRefreshPopup(true); return;
      }
      try {
        const { data: payment } = await supabase
          .from("user_payments").select("*").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (payment?.status === "completed") {
          stopPolling(); setPaymentStatus("completed"); setLoading(false); setShowRefreshPopup(false);
          
          // Calculate subscription expiry based on selected plan
          const planDuration = PLANS[selectedPlan].duration;
          const now = new Date();
          const expiryDate = new Date(now);
          expiryDate.setDate(expiryDate.getDate() + planDuration);
          
          await supabase.from("users").update({
            has_paid: true,
            payment_status: "completed",
            is_active: true,
            subscription_plan: selectedPlan,
            subscription_activated_at: now.toISOString(),
            subscription_expires_at: expiryDate.toISOString(),
            updated_at: now.toISOString(),
          }).eq("auth_id", userId);
          const profile = await refreshUserProfile(userId);
          if (profile) {
            if (!profile.first_name || !profile.age) { if (mountedRef.current) router.replace("/registration"); }
            else { if (mountedRef.current) router.replace("/(tabs)/(home)"); }
          } else { if (mountedRef.current) router.replace("/registration"); }
        }
      } catch (err) { console.warn("Poll error:", err); }
    }, POLL_INTERVAL_MS) as unknown as number;
  }, [userId, refreshUserProfile]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current as any); pollRef.current = null; }
    setPolling(false); pollStartedAt.current = null;
  }, []);

  useEffect(() => { return () => stopPolling(); }, [stopPolling]);

  // ── Verify ────────────────────────────────────────────────────────────────────
  const verifyReferenceAndRedirect = useCallback(async (reference: string) => {
    try {
      setLoading(true); setPaymentStatus("initiated");
      const res  = await fetch(`${VERIFY_CALLBACK_BASE}?reference=${encodeURIComponent(reference)}`);
      const json = await res.json();
      if (json.success) {
        stopPolling(); setPaymentStatus("completed"); setLoading(false); setShowRefreshPopup(false);
        const profile = await refreshUserProfile(userId);
        if (profile) {
          if (!profile.first_name || !profile.age) { if (mountedRef.current) router.replace("/registration"); }
          else { if (mountedRef.current) router.replace("/(tabs)/(home)"); }
        } else { if (mountedRef.current) router.replace("/registration"); }
      } else {
        setLoading(false); setPaymentStatus("pending"); startPolling();
      }
    } catch (err) {
      console.error("Verification error:", err); setLoading(false);
      Alert.alert("Verification error", "Could not verify payment.");
    }
  }, [userId, refreshUserProfile, startPolling, stopPolling]);

  // ── Pay ───────────────────────────────────────────────────────────────────────
  const handlePay = useCallback(async () => {
    if (!userId) { Alert.alert("Not logged in", "Please sign in and try again."); return; }
    if (!phoneNumber) {
      Alert.alert("Missing phone", "Please enter your M-Pesa number.");
      phoneInputRef.current?.focus(); return;
    }
    if (!/^0[17]\d{8}$/.test(phoneNumber)) {
      Alert.alert("Invalid number", "Enter a valid Kenyan number (07XXXXXXXX or 01XXXXXXXX).");
      phoneInputRef.current?.focus(); return;
    }
    try {
      setLoading(true); setPaymentStatus("initiated");
      const { data: authData } = await supabase.auth.getUser();
      const userEmail = authData?.user?.email;
      if (!userEmail) throw new Error("No email for current user");

      const reference = `HANNAS_CONNECT_SUBSCRIPTION_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      const result = await PaystackService.initiateCharge({
        email: userEmail, amount: PLANS[selectedPlan].amount, userId, reference,
        currency: "KES", phoneNumber, redirect_url: "hannasconnect://payment-new",
      });

      if (!result.success || !result.data) throw new Error(result.error?.message || "Failed to start payment");

      const backendRef = result.data.reference || reference;
      setCheckoutReference(backendRef); setPaymentStatus("pending"); setLoading(false);
      startPolling();

      if (result.data.authorization_url) {
        Linking.openURL(result.data.authorization_url).catch(() =>
          Alert.alert("Open payment", "Unable to open payment page.")
        );
      } else {
        setShowRefreshPopup(true);
        Alert.alert(
          "M-Pesa Prompt Sent",
          `Check your phone (${phoneNumber}) for the M-Pesa prompt.\n\nRef: ${backendRef}`,
          [{ text: "OK" }]
        );
      }
    } catch (err: any) {
      console.error("handlePay error", err); setPaymentStatus("failed"); setLoading(false); setShowRefreshPopup(false);
      Alert.alert("Payment error", err?.message || "Could not initiate payment");
    }
  }, [phoneNumber, userId, startPolling, selectedPlan]);

  // ── Refresh ───────────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true); setShowRefreshPopup(false);
    try {
      const profile = await refreshUserProfile(userId);
      if (profile?.has_paid || profile?.payment_status === "completed") {
        if (!profile.first_name || !profile.age) { if (mountedRef.current) router.replace("/registration"); }
        else { if (mountedRef.current) router.replace("/(tabs)/(home)"); }
        return;
      }
      const { data: payment } = await supabase
        .from("user_payments").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (payment?.status === "completed") {
        await supabase.from("users").update({
          has_paid: true, payment_status: "completed", is_active: true, updated_at: new Date().toISOString(),
        }).eq("auth_id", userId);
        const up = await refreshUserProfile(userId);
        if (up && (!up.first_name || !up.age)) { if (mountedRef.current) router.replace("/registration"); }
        else { if (mountedRef.current) router.replace("/(tabs)/(home)"); }
      } else {
        setLoading(false);
        if (paymentStatus === "pending") setShowRefreshPopup(true);
        Alert.alert("Still waiting", "Payment not yet confirmed. Please try again shortly.");
      }
    } catch (err) {
      console.error("Refresh error:", err); setLoading(false);
      Alert.alert("Error", "Could not refresh payment status.");
    }
  }, [userId, refreshUserProfile, paymentStatus]);

  // ── UI Helpers ────────────────────────────────────────────────────────────────
  const onFocusPhone = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 260);

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (paymentStatus !== "idle") {
      setCurrentStep(2);
    } else if (phoneNumber !== "") {
      setCurrentStep(1);
    } else {
      setCurrentStep(0);
    }
  }, [paymentStatus, phoneNumber]);

  const plan = PLANS[selectedPlan];

  // Only render the active step section
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            {/* ✅ Membership Platform Notice */}
            <View style={S.membershipNotice}>
              <Text style={S.membershipNoticeText}>
                🔒 Hanna's Connect is a paid private membership platform
              </Text>
            </View>

            <Text style={S.sectionHeading}>Select Plan</Text>
            <View style={{ gap: 10, marginBottom: 18 }}>
              {(Object.entries(PLANS) as Array<[keyof typeof PLANS, typeof PLANS[keyof typeof PLANS]]>)
                .map(([key, p]) => {
                const active = selectedPlan === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedPlan(key)}
                    style={[S.planCard, active ? S.planCardActive : S.planCardIdle]}
                  >
                    {p.badge && (
                      <View style={S.ribbon}>
                        <Text style={S.ribbonText}>{p.badge}</Text>
                      </View>
                    )}
                    <View style={S.planRow}>
                      <View style={[S.planRadio, active && S.planRadioActive]}>
                        {active && <View style={S.planRadioDot} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[S.planName, active && { color: colors.primary }]}>{p.label}</Text>
                        <Text style={S.planSub}>{p.sublabel}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[S.planPrice, active && { color: colors.primary }]}>
                          KSH {p.amount.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    {active && (
                      <View style={S.planDivider} />
                    )}
                    {/* Guarantee text inside every plan card */}
                    <View style={S.guaranteeBox}>
                      <Text style={S.guaranteeText}>
                        ✅ {p.amount === 3020
                          ? "If you don't get at least 3 matches, your membership is renewed for FREE"
                          : "If you don't get at least 7 matches, your membership is renewed for FREE"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                S.ctaBtn,
                { marginTop: 10, marginBottom: 16 }
              ]}
              onPress={() => {
                setCurrentStep(1);
                setTimeout(() => {
                  phoneInputRef.current?.focus();
                }, 100);
              }}
            >
              <Text style={S.ctaText}>Continue to Payment</Text>
              <IconSymbol name="arrow.forward" size={16} color="#fff" />
            </Pressable>
          </>
        );

      case 1:
        return (
          <>
            <Text style={S.sectionHeading}>Payment Details</Text>
            <View style={S.inputCard}>
              <View style={S.methodRow}>
                <View style={S.mpesaDot}><Text style={{ fontSize: 15 }}>🟢</Text></View>
                <View>
                  <Text style={S.methodName}>M-Pesa STK Push</Text>
                  <Text style={S.methodDesc}>Instant mobile payment</Text>
                </View>
                <View style={S.verifiedBadge}>
                  <Text style={S.verifiedText}>Verified</Text>
                </View>
              </View>

              <View style={S.dividerLine} />

              <Text style={S.inputLabel}>M-Pesa Number</Text>
              <Pressable style={S.inputWrap} onPress={() => phoneInputRef.current?.focus()}>
                <View style={S.inputPrefix} pointerEvents="none">
                  <Text style={S.prefixText}>🇰🇪  +254</Text>
                </View>
                <TextInput
                  ref={phoneInputRef}
                  style={S.input}
                  placeholder="07XX XXX XXX"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType={Platform.OS === 'web' ? 'text' : 'number-pad'}
                  inputMode="numeric"
                  value={phoneNumber}
                  onChangeText={(t) => setPhoneNumber(t.replace(/[^0-9]/g, ""))}
                  autoFocus={false}
                  returnKeyType="done"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={10}
                  underlineColorAndroid="transparent"
                  editable={true}
                  selectTextOnFocus={true}
                  blurOnSubmit={true}
                  zIndex={10}
                />
              </Pressable>
              <Text style={S.inputHint}>
                An M-Pesa prompt will be sent to this number immediately.
              </Text>
            </View>

            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: 12,
                marginTop: 8,
              }}
              onPress={() => {
                setCurrentStep(0);
                setPhoneNumber("");
              }}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Back to plans</Text>
            </Pressable>
          </>
        );

      case 2:
        return null; // Payment processing state

      default:
        return null;
    }
  };

  const statusColor =
    paymentStatus === "completed" ? PALETTE.success :
    paymentStatus === "failed"    ? PALETTE.error    : PALETTE.brand;

  const buttonLabel =
    loading && paymentStatus !== "completed" ? "Processing…"       :
    paymentStatus === "initiated"            ? "Sending STK Push…" :
    paymentStatus === "pending"              ? "Awaiting M-Pesa…"  :
    paymentStatus === "completed"            ? "Payment Complete ✓": 
    `Pay KSH ${plan.amount.toLocaleString()}`;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
          <View style={S.root}>

            {/* ─── Header ──────────────────────────────────────────────────── */}
            <View style={S.header}>
              <Pressable style={S.backBtn} onPress={() => {
                Alert.alert(
                  "Leave Payment?",
                  "Payment is required to access the app.",
                  [
                    { text: "Stay",  style: "cancel" },
                    { text: "Leave", style: "destructive", onPress: () => safeBack(router, "/welcome") },
                  ]
                );
              }}>
                <IconSymbol name="chevron.left" size={20} color={PALETTE.inkMid} />
              </Pressable>

              <View style={{ alignItems: "center" }}>
                <Text style={S.headerTitle}>Complete Payment</Text>
                <Text style={S.headerSub}>Hanna's Connect</Text>
              </View>

              {/* Secure badge */}
              <View style={S.secureBadge}>
                <IconSymbol name="lock.fill" size={11} color={PALETTE.brand} />
                <Text style={S.secureText}>Secure</Text>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ─── Progress ──────────────────────────────────────────────── */}
              <ProgressSteps step={currentStep} />

              {/* ─── Status Banner ─────────────────────────────────────────── */}
              {paymentStatus !== "idle" && (
                <View style={[S.statusBanner, { backgroundColor:
                  paymentStatus === "completed" ? colors.successSoft :
                  paymentStatus === "failed"    ? colors.errorSoft   : colors.primaryLight,
                  borderColor: statusColor,
                }]}>
                  <View style={[S.statusDot, { backgroundColor: statusColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[S.statusTitle, { color: statusColor }]}>
                      {paymentStatus === "completed" ? "Payment Confirmed" :
                       paymentStatus === "failed"    ? "Payment Failed"    : "Awaiting Confirmation"}
                    </Text>
                    <Text style={S.statusSub}>
                      {paymentStatus === "pending"   ? `Check your phone — ${phoneNumber || "…"}` :
                       paymentStatus === "completed" ? "Redirecting you now…"                      :
                       paymentStatus === "failed"    ? "Please try again below."                   :
                       "Initiating payment…"}
                    </Text>
                  </View>
                  {paymentStatus === "pending" && (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <PulsingDot delay={0}   />
                      <PulsingDot delay={180} />
                      <PulsingDot delay={360} />
                    </View>
                  )}
                </View>
              )}

              {paymentStatus === "idle" && renderStepContent()}

              {/* ─── Terms ─────────────────────────────────────────────────── */}
              <Text style={S.terms}>
                By proceeding, you agree to our{" "}
                <Text style={{ color: colors.primary }}>Terms of Service</Text> and{" "}
                <Text style={{ color: colors.primary }}>Privacy Policy</Text>.
                Subscription valid for {plan.duration} days from activation.
              </Text>
              
              {/* Non Refundable Notice */}
              <View style={S.nonRefundableBox}>
                <Text style={S.nonRefundableText}>
                  ⚠️ All membership fees are non refundable
                </Text>
              </View>
            </ScrollView>

            {/* ─── Footer CTA ──────────────────────────────────────────────── */}
            <View style={S.footer}>
              {currentStep === 1 && (
                <>
                  {/* Summary row only when on final step */}
                  <View style={S.summaryRow}>
                    <Text style={S.summaryLabel}>Total Due</Text>
                    <Text style={S.summaryAmount}>KSH {plan.amount.toLocaleString()}</Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      S.ctaBtn,
                      paymentStatus === "completed" && { backgroundColor: colors.success },
                      (loading || paymentStatus === "completed") && S.ctaDisabled,
                      pressed && !loading && { opacity: 0.88, transform: [{ scale: 0.985 }] },
                    ]}
                    onPress={() => { Keyboard.dismiss(); handlePay(); }}
                    disabled={loading || paymentStatus === "completed"}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        {paymentStatus === "pending" ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <PulsingDot />
                            <PulsingDot delay={200} />
                            <PulsingDot delay={400} />
                            <Text style={[S.ctaText, { marginLeft: 6 }]}>{buttonLabel}</Text>
                          </View>
                        ) : (
                          <>
                            <Text style={S.ctaText}>{buttonLabel}</Text>
                            {paymentStatus !== "completed" && (
                              <IconSymbol name="arrow.forward" size={16} color="#fff" />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </Pressable>

                  <Text style={S.footerNote}>
                    🔒  Secured by Paystack · No card details stored
                  </Text>
                </>
              )}
            </View>

            {/* ─── Refresh Modal ───────────────────────────────────────────── */}
            <Modal
              transparent
              visible={showRefreshPopup}
              animationType="fade"
              onRequestClose={() => setShowRefreshPopup(false)}
            >
              <View style={S.overlay}>
                <View style={S.modal}>
                  {/* Animated dots */}
                  <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 14 }}>
                    <PulsingDot delay={0}   />
                    <PulsingDot delay={200} />
                    <PulsingDot delay={400} />
                  </View>

                  <Text style={S.modalTitle}>Waiting for M-Pesa</Text>
                  <Text style={S.modalBody}>
                    Complete the STK prompt on your phone. If you don't see it, tap below to check your payment status.
                  </Text>

                  {checkoutReference && (
                    <View style={S.modalRef}>
                      <Text style={S.modalRefLabel}>Ref</Text>
                      <Text style={S.modalRefVal} numberOfLines={1}>{checkoutReference}</Text>
                    </View>
                  )}

                  <Pressable
                    style={[S.modalBtn, loading && { opacity: 0.7 }]}
                    onPress={handleRefresh}
                    disabled={loading}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={S.modalBtnText}>🔄  Refresh Payment Status</Text>
                    }
                  </Pressable>

                  <Pressable style={S.modalCancel} onPress={() => setShowRefreshPopup(false)}>
                    <Text style={S.modalCancelText}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.surfaceAlt },
  root: { flex: 1, backgroundColor: PALETTE.surfaceAlt },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: PALETTE.surface,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.divider,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PALETTE.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16, fontWeight: "700", color: PALETTE.ink,
    fontFamily: FONT.display,
  },
  headerSub: {
    fontSize: 11, color: PALETTE.inkSoft, marginTop: 1,
  },
  secureBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: PALETTE.brandSoft,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10,
  },
  secureText: { fontSize: 11, fontWeight: "600", color: PALETTE.brand },

  // Status Banner
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1,
    marginBottom: 14,
  },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusTitle: { fontSize: 13, fontWeight: "700" },
  statusSub:   { fontSize: 12, color: PALETTE.inkSoft, marginTop: 1 },

  // Hero card
  heroCard: {
    backgroundColor: PALETTE.brand,
    borderRadius: 18, padding: 20, marginBottom: 18,
    flexDirection: "row",
    overflow: "hidden",
  },
  heroLeft: { flex: 1 },
  heroEyebrow: {
    fontSize: 11, fontWeight: "600", color: PALETTE.brandMuted,
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 4,
  },
  heroTitle: {
    fontSize: 24, fontWeight: "800", color: "#fff",
    fontFamily: FONT.display, lineHeight: 30,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: PALETTE.brandLight,
  },
  featureLabel: { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  heroBadgeWrap: { justifyContent: "center", alignItems: "flex-end", paddingLeft: 10 },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16, padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  heroBadgeNum: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroBadgeSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  // Section heading
  sectionHeading: {
    fontSize: 13, fontWeight: "700", color: PALETTE.inkSoft,
    letterSpacing: 0.8, textTransform: "uppercase",
    marginBottom: 10,
  },

  // Plan cards
  planCard: {
    borderRadius: 14, padding: 16,
    borderWidth: 1.5,
    backgroundColor: PALETTE.surface,
    overflow: "hidden",
  },
  planCardIdle:   { borderColor: PALETTE.divider },
  planCardActive: {
    borderColor: PALETTE.brand,
    backgroundColor: PALETTE.brandSoft,
    shadowColor: PALETTE.brand,
    shadowOpacity: 0.12, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ribbon: {
    position: "absolute", top: 0, right: 0,
    backgroundColor: PALETTE.gold,
    paddingHorizontal: 10, paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  ribbonText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  planRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: PALETTE.inkFaint,
    alignItems: "center", justifyContent: "center",
  },
  planRadioActive: { borderColor: PALETTE.brand },
  planRadioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: PALETTE.brand },
  planName:        { fontSize: 15, fontWeight: "700", color: PALETTE.ink },
  planSub:         { fontSize: 12, color: PALETTE.inkSoft, marginTop: 1 },
  planPrice:       { fontSize: 18, fontWeight: "800", color: PALETTE.ink },
  planPerDay:      { fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 },
  planDivider: {
    height: 1, backgroundColor: PALETTE.brandMuted, marginVertical: 12,
  },
  planFeatures:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  planFeatureItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  planFeatureText: { fontSize: 12, color: PALETTE.inkMid, fontWeight: "500" },

  // Input card
  inputCard: {
    backgroundColor: PALETTE.surface, borderRadius: 14,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: PALETTE.divider,
  },
  methodRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  mpesaDot: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: PALETTE.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  methodName:  { fontSize: 14, fontWeight: "700", color: PALETTE.ink },
  methodDesc:  { fontSize: 12, color: PALETTE.inkSoft, marginTop: 1 },
  verifiedBadge: {
    marginLeft: "auto",
    backgroundColor: PALETTE.successSoft,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  verifiedText: { fontSize: 11, fontWeight: "600", color: PALETTE.success },
  dividerLine:  { height: 1, backgroundColor: PALETTE.divider, marginVertical: 12 },
  inputLabel:   { fontSize: 12, fontWeight: "600", color: PALETTE.inkMid, marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: PALETTE.divider,
    borderRadius: 10, overflow: "hidden",
    backgroundColor: PALETTE.surfaceAlt,
  },
  inputPrefix: {
    paddingHorizontal: 12, paddingVertical: 13,
    borderRightWidth: 1, borderRightColor: PALETTE.divider,
    backgroundColor: PALETTE.surface,
  },
  prefixText: { fontSize: 14, color: PALETTE.inkMid, fontWeight: "600" },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 13,
    fontSize: 15, color: PALETTE.ink, fontWeight: "600",
  },
  inputHint: { fontSize: 12, color: PALETTE.inkSoft, marginTop: 8, lineHeight: 17 },

  // Reference
  refCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: PALETTE.surface,
    borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: PALETTE.divider,
  },
  refLabel: { fontSize: 11, fontWeight: "700", color: PALETTE.inkSoft, minWidth: 28 },
  refValue: {
    flex: 1, fontSize: 12, color: PALETTE.inkMid,
    fontFamily: FONT.mono,
  },

  // Terms
  terms: {
    fontSize: 12, color: PALETTE.inkSoft, lineHeight: 18,
    textAlign: "center", marginVertical: 8,
    paddingHorizontal: 4,
  },

  // Footer
  footer: {
    backgroundColor: PALETTE.surface,
    borderTopWidth: 1, borderTopColor: PALETTE.divider,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
  },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel:  { fontSize: 13, color: PALETTE.inkSoft, fontWeight: "500" },
  summaryAmount: { fontSize: 20, fontWeight: "800", color: PALETTE.ink },
  ctaBtn: {
    backgroundColor: PALETTE.brand,
    paddingVertical: 15, borderRadius: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: PALETTE.brand,
    shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  ctaDisabled: { opacity: 0.65 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  membershipNotice: {
    backgroundColor: PALETTE.brandSoft,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PALETTE.brandMuted,
  },
  membershipNoticeText: {
    fontSize: 14,
    fontWeight: "600",
    color: PALETTE.brand,
    textAlign: "center",
  },
  guaranteeBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: PALETTE.successSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PALETTE.success + '30',
  },
  guaranteeText: {
    fontSize: 12,
    fontWeight: "600",
    color: PALETTE.success,
    textAlign: "center",
    lineHeight: 16,
  },
  footerNote: {
    fontSize: 11,
    color: PALETTE.inkSoft,
    textAlign: "center",
    marginTop: 8,
  },

  // Modal
  overlay: {
    flex: 1, backgroundColor: "rgba(15,25,35,0.55)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  modal: {
    backgroundColor: PALETTE.surface, borderRadius: 20,
    padding: 24, width: "90%", maxWidth: 380, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 }, elevation: 12,
    gap: 6,
  },
  modalTitle:   { fontSize: 18, fontWeight: "700", color: PALETTE.ink, textAlign: "center", marginTop: 6 },
  modalBody:    { fontSize: 14, color: PALETTE.inkSoft, textAlign: "center", lineHeight: 21, marginBottom: 6 },
  modalRef: {
    width: "100%", flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: PALETTE.surfaceAlt, borderRadius: 8, padding: 10,
  },
  modalRefLabel: { fontSize: 11, fontWeight: "700", color: PALETTE.inkSoft },
  modalRefVal:   { flex: 1, fontSize: 11, color: PALETTE.inkMid, fontFamily: FONT.mono },
  modalBtn: {
    marginTop: 8, width: "100%",
    backgroundColor: PALETTE.brand, paddingVertical: 13,
    borderRadius: 11, alignItems: "center",
  },
  modalBtnText:    { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalCancel:     { marginTop: 10, padding: 6 },
  modalCancelText: { color: PALETTE.inkSoft, fontWeight: "600", fontSize: 14 },
});