// PaymentScreen.tsx
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from "../utils/safeRouter";
import { IconSymbol } from "../components/IconSymbol";
import { colors, commonStyles } from "../styles/commonStyles";
import { supabase } from "./integrations/supabase/client";
import PaystackService from "./integrations/paystack/service";
import APP_CONFIG from "../constants/config";

/**
 * PaymentScreen - With popup "Refresh" after STK is sent
 */

const AMOUNT_KES = 3000;
// ✅ FIXED: Removed trailing spaces from URL
const VERIFY_CALLBACK_BASE = "https://dbvsexpcrojtnriqfbwa.supabase.co/functions/v1/verify-payment";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;

export default function PaymentScreen() {
  const { width } = useWindowDimensions();
  const isSmall = width < 375;
  const spacing = (n: number) => n * (isSmall ? 8 : 10);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "initiated" | "pending" | "completed" | "failed"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [checkoutReference, setCheckoutReference] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [showRefreshPopup, setShowRefreshPopup] = useState(false);
  const pollRef = useRef<number | null>(null);
  const pollStartedAt = useRef<number | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const phoneInputRef = useRef<TextInput | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------- Refresh user profile ----------
  const refreshUserProfile = useCallback(async (authUserId?: string | null) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authUserId ? { id: authUserId } : authData?.user;
      if (!authUser) return null;

      const { data: byAuth } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUser.id)
        .maybeSingle();

      if (byAuth) return byAuth;

      const email = authData?.user?.email;
      if (!email) return null;
      const { data: byEmail } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (!byEmail) return null;

      if (!byEmail.auth_id) {
        await supabase
          .from("users")
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

  // ---------- Initial user check ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Redirect if payment is disabled
        if (!APP_CONFIG.FEATURES.REQUIRE_PAYMENT) {
          if (mounted) {
            router.replace("/registration");
          }
          return;
        }
        
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) {
            Alert.alert("Not logged in", "Please sign in to continue.", [
              { text: "OK", onPress: () => router.replace("/login") },
            ]);
          }
          return;
        }
        if (mounted) setUserId(user.id);

        const profile = await refreshUserProfile(user.id);
        if (!profile) {
          Alert.alert(
            "Profile not found",
            "Please complete registration before paying.",
            [{ text: "Go to Registration", onPress: () => router.replace("/registration") }]
          );
          return;
        }

        if (profile.has_paid || profile.payment_status === "completed") {
          if (!profile.first_name || !profile.age) {
            if (mounted) router.replace("/registration");
          } else {
            if (mounted) router.replace("/(tabs)/(home)");
          }
          return;
        }
      } catch (err) {
        console.error("Initial user check error:", err);
      }
    })();

    return () => { mounted = false; };
  }, [refreshUserProfile]);

  // ---------- Deep-link handling ----------
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const u = new URL(event.url);
        const reference = u.searchParams.get("reference") || u.searchParams.get("tx_ref");
        if (reference) {
          verifyReferenceAndRedirect(reference);
        }
      } catch (e) {
        console.warn("Failed to parse incoming URL", e);
      }
    };

    const sub = Linking.addEventListener("url", handleUrl);

    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) handleUrl({ url: initial });
    })();

    return () => sub.remove();
  }, []);

  // ---------- Realtime subscription ----------
  useEffect(() => {
    if (!userId) return;
    let unsub: any = null;
    const start = async () => {
      try {
        unsub = await PaystackService.subscribeToPaymentUpdates(userId, async (evt: any) => {
          const ref = evt.transaction_id || evt.reference || null;
          if (ref) setCheckoutReference(ref);

          const completed = evt.status === "completed" || evt.payment_completed === true;

          if (completed) {
            stopPolling();
            setPaymentStatus("completed");
            setLoading(false);
            setShowRefreshPopup(false);

            const profile = await refreshUserProfile(userId);
            if (profile) {
              if (!profile.first_name || !profile.age) {
                router.replace("/registration");
              } else {
                router.replace("/(tabs)/(home)");
              }
            } else {
              router.replace("/registration");
            }
          } else if (evt.status === "failed") {
            stopPolling();
            setPaymentStatus("failed");
            setLoading(false);
            setShowRefreshPopup(false);
            Alert.alert("Payment failed", "Payment failed. Please try again.");
          }
        });
      } catch (err) {
        console.warn("subscribeToPaymentUpdates failed", err);
      }
    };

    start();

    return () => {
      if (unsub?.unsubscribe) unsub.unsubscribe();
      if (typeof unsub === "function") unsub();
    };
  }, [userId, refreshUserProfile]);

  // ---------- Polling ----------
  const startPolling = useCallback(() => {
    if (pollRef.current || !userId) return;

    pollStartedAt.current = Date.now();
    setPolling(true);
    setPaymentStatus("pending");

    pollRef.current = setInterval(async () => {
      if (!userId || !mountedRef.current) return;

      if (pollStartedAt.current && Date.now() - pollStartedAt.current > POLL_TIMEOUT_MS) {
        stopPolling();
        setShowRefreshPopup(true);
        return;
      }

      try {
        const { data: payment } = await supabase
          .from("user_payments")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (payment?.status === "completed") {
          stopPolling();
          setPaymentStatus("completed");
          setLoading(false);
          setShowRefreshPopup(false);

          await supabase
            .from("users")
            .update({
              has_paid: true,
              payment_status: "completed",
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("auth_id", userId);

          const profile = await refreshUserProfile(userId);
          if (profile) {
            if (!profile.first_name || !profile.age) {
              if (mountedRef.current) router.replace("/registration");
            } else {
              if (mountedRef.current) router.replace("/(tabs)/(home)");
            }
          } else {
            if (mountedRef.current) router.replace("/registration");
          }
        }
      } catch (err) {
        console.warn("Poll error:", err);
      }
    }, POLL_INTERVAL_MS) as unknown as number;
  }, [userId, refreshUserProfile]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current as any);
      pollRef.current = null;
    }
    setPolling(false);
    pollStartedAt.current = null;
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ---------- Verify reference ----------
  const verifyReferenceAndRedirect = useCallback(
    async (reference: string) => {
      try {
        setLoading(true);
        setPaymentStatus("initiated");
        const res = await fetch(`${VERIFY_CALLBACK_BASE}?reference=${encodeURIComponent(reference)}`);
        const json = await res.json();

        if (json.success) {
          stopPolling();
          setPaymentStatus("completed");
          setLoading(false);
          setShowRefreshPopup(false);

          const profile = await refreshUserProfile(userId);
          if (profile) {
            if (!profile.first_name || !profile.age) {
              if (mountedRef.current) router.replace("/registration");
            } else {
              if (mountedRef.current) router.replace("/(tabs)/(home)");
            }
          } else {
            if (mountedRef.current) router.replace("/registration");
          }
        } else {
          setLoading(false);
          setPaymentStatus("pending");
          startPolling();
        }
      } catch (err) {
        console.error("Verification error:", err);
        setLoading(false);
        Alert.alert("Verification error", "Could not verify payment.");
      }
    },
    [userId, refreshUserProfile, startPolling, stopPolling]
  );

  // ---------- Initiate Payment ----------
  const handlePay = useCallback(async () => {
    try {
      if (!userId) {
        Alert.alert("Not logged in", "Please sign in and try again.");
        return;
      }
      if (!phoneNumber) {
        Alert.alert("Missing phone", "Please enter your phone number.");
        phoneInputRef.current?.focus();
        return;
      }
      const validKenyan = /^0[17]\d{8}$/.test(phoneNumber);
      if (!validKenyan) {
        Alert.alert("Invalid phone", "Enter a valid Kenyan number (07XXXXXXXX or 01XXXXXXXX).");
        phoneInputRef.current?.focus();
        return;
      }

      setLoading(true);
      setPaymentStatus("initiated");

      const { data: authData } = await supabase.auth.getUser();
      const userEmail = authData?.user?.email;
      if (!userEmail) throw new Error("No email for current user");

      const reference = `HANNAS_CONNECT_SUBSCRIPTION_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

      const result = await PaystackService.initiateCharge({
        email: userEmail,
        amount: 3000,
        userId,
        reference,
        currency: "KES",
        phoneNumber,
        redirect_url: "hannasconnect://payment-new",
      });

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || "Failed to start payment");
      }

      const backendRef = result.data.reference || reference;
      setCheckoutReference(backendRef);
      setPaymentStatus("pending");
      setLoading(false);

      startPolling();

      if (result.data.authorization_url) {
        Linking.openURL(result.data.authorization_url).catch(() => {
          Alert.alert("Open payment", "Unable to open payment page.");
        });
      } else {
        // Show popup right after STK is sent
        setShowRefreshPopup(true);
        Alert.alert(
          "M-Pesa STK Push initiated",
          `You should receive an M-Pesa prompt on ${phoneNumber}. Reference: ${backendRef}`,
          [{ text: "OK" }]
        );
      }
    } catch (err: any) {
      console.error("handlePay error", err);
      setPaymentStatus("failed");
      setLoading(false);
      setShowRefreshPopup(false);
      Alert.alert("Payment error", err?.message || "Could not initiate payment");
    }
  }, [phoneNumber, userId, startPolling]);

  // ---------- MANUAL REFRESH ----------
  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setShowRefreshPopup(false);

    try {
      const profile = await refreshUserProfile(userId);
      if (profile?.has_paid || profile?.payment_status === "completed") {
        if (!profile.first_name || !profile.age) {
          if (mountedRef.current) router.replace("/registration");
        } else {
          if (mountedRef.current) router.replace("/(tabs)/(home)");
        }
        return;
      }

      const { data: payment } = await supabase
        .from("user_payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (payment?.status === "completed") {
        await supabase
          .from("users")
          .update({
            has_paid: true,
            payment_status: "completed",
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("auth_id", userId);

        const updatedProfile = await refreshUserProfile(userId);
        if (updatedProfile && (!updatedProfile.first_name || !updatedProfile.age)) {
          if (mountedRef.current) router.replace("/registration");
        } else {
          if (mountedRef.current) router.replace("/(tabs)/(home)");
        }
      } else {
        setLoading(false);
        if (paymentStatus === "pending") {
          setShowRefreshPopup(true);
        }
        Alert.alert("Payment not found", "No completed payment detected.");
      }
    } catch (err) {
      console.error("Refresh error:", err);
      setLoading(false);
      Alert.alert("Error", "Could not refresh payment status.");
    }
  }, [userId, refreshUserProfile, paymentStatus]);

  // ---------- UX ----------
  const onFocusPhone = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 260);
  };

  const paymentLabel = () => {
    if (loading && paymentStatus !== "completed") return "Processing...";
    if (paymentStatus === "initiated") return "Initiating STK Push...";
    if (paymentStatus === "pending") return "Waiting for M-Pesa...";
    if (paymentStatus === "completed") return "Payment Complete ✓";
    return `Pay KSH ${AMOUNT_KES.toLocaleString()} via M-Pesa`;
  };

  // ---------- Render ----------
  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.root, { padding: spacing(2) }]}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => safeBack(router, "/(tabs)/(home)")}>
                <IconSymbol name="chevron.left" size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.headerTitle, { fontSize: isSmall ? 18 : 20 }]}>Complete Payment</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Status Card */}
              {paymentStatus !== "idle" && (
                <View style={[styles.card, styles.center, { marginBottom: spacing(2) }]}>
                  <IconSymbol
                    name={
                      paymentStatus === "completed"
                        ? "checkmark.circle.fill"
                        : paymentStatus === "failed"
                        ? "xmark.circle.fill"
                        : "clock.fill"
                    }
                    size={isSmall ? 40 : 48}
                    color={
                      paymentStatus === "completed"
                        ? colors.success
                        : paymentStatus === "failed"
                        ? colors.error
                        : colors.accent
                    }
                  />
                  <Text style={[styles.cardTitle, { fontSize: isSmall ? 18 : 22, marginTop: 10 }]}>
                    {paymentStatus === "completed"
                      ? "Payment Complete"
                      : paymentStatus === "failed"
                      ? "Payment Failed"
                      : "Awaiting Payment"}
                  </Text>
                  <Text style={[styles.cardText, { marginTop: 8 }]}>
                    {paymentStatus === "pending"
                      ? `Please complete the M-Pesa prompt on ${phoneNumber || "your phone"}`
                      : paymentStatus === "completed"
                      ? "Thank you! We're redirecting you."
                      : "Please follow the on-screen steps."}
                  </Text>

                  {checkoutReference ? (
                    <Text style={[styles.smallMono, { marginTop: 8 }]}>Reference: {checkoutReference}</Text>
                  ) : null}
                </View>
              )}

              {/* Info Card */}
              <View style={[styles.card, { marginBottom: spacing(2) }]}>
                <View style={styles.row}>
                  <IconSymbol name="checkmark.circle.fill" size={36} color={colors.success} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>Almost There!</Text>
                    <Text style={styles.cardText}>
                      Complete payment to unlock full access to Hanna's Connect.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Pricing Card */}
              <View
                style={[
                  styles.card,
                  { marginBottom: spacing(2), borderColor: colors.primary, borderWidth: 1 },
                ]}
              >
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, { fontSize: isSmall ? 18 : 20 }]}>
                    180-Day Access
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Best value</Text>
                  </View>
                </View>
                <Text style={[styles.price, { fontSize: isSmall ? 28 : 34 }]}>
                  KSH {AMOUNT_KES.toLocaleString()}
                </Text>
                <Text style={styles.cardText}>Full access for 6 months</Text>

                <View style={{ marginTop: spacing(1) }}>
                  <View style={styles.feature}>
                    <IconSymbol name="checkmark" size={18} color={colors.success} />
                    <Text style={styles.featureText}>Private messaging</Text>
                  </View>
                  <View style={styles.feature}>
                    <IconSymbol name="checkmark" size={18} color={colors.success} />
                    <Text style={styles.featureText}>Unlimited connections</Text>
                  </View>
                  <View style={styles.feature}>
                    <IconSymbol name="checkmark" size={18} color={colors.success} />
                    <Text style={styles.featureText}>Auto-renewal if less than 5 connections</Text>
                  </View>
                </View>
              </View>

              {/* Payment method */}
              <View style={[styles.card, { marginBottom: spacing(2) }]}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                <View style={[styles.rowBetween, { alignItems: "center" }]}>
                  <View style={styles.row}>
                    <View style={styles.methodIcon}>
                      <Text style={{ fontSize: 18 }}>🟢</Text>
                    </View>
                    <View>
                      <Text style={styles.methodTitle}>M-Pesa STK Push</Text>
                      <Text style={styles.cardText}>Direct M-Pesa payment via STK Push</Text>
                    </View>
                  </View>
                  <IconSymbol name="checkmark.circle.fill" size={22} color={colors.primary} />
                </View>
              </View>

              {/* Phone input */}
              <View style={[styles.card, { marginBottom: spacing(2) }]}>
                <Text style={styles.sectionTitle}>M-Pesa STK Push Details</Text>
                <Text style={styles.label}>Mobile Money Number</Text>
                <TextInput
                  ref={phoneInputRef}
                  style={[styles.input, { paddingVertical: isSmall ? 12 : 14 }]}
                  placeholder="e.g. 0712345678"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={(t) => setPhoneNumber(t.replace(/\s/g, ""))}
                  onFocus={onFocusPhone}
                  returnKeyType="done"
                />
                <Text style={styles.hint}>
                  This number will receive the M-Pesa STK Push prompt.
                </Text>
              </View>

              {/* Terms */}
              <View style={[styles.card, { marginBottom: spacing(3) }]}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <IconSymbol name="info" size={18} color={colors.textSecondary} />
                  <Text style={styles.cardText}>
                    By proceeding you agree to our Terms of Service and Privacy Policy. Subscription
                    valid for 180 days.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Sticky action area */}
            <View style={[styles.footer, { padding: spacing(2) }]}>
              <Pressable
                style={[
                  styles.payButton,
                  {
                    backgroundColor:
                      paymentStatus === "completed" ? colors.success : colors.primary,
                  },
                  (loading || paymentStatus === "completed") && styles.disabledButton,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  handlePay();
                }}
                disabled={loading || paymentStatus === "completed"}
              >
                {loading ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <>
                    <Text style={styles.payButtonText}>{paymentLabel()}</Text>
                    {paymentStatus !== "completed" && (
                      <IconSymbol name="arrow.forward" size={18} color={colors.card} />
                    )}
                  </>
                )}
              </Pressable>
            </View>

            {/* POPUP MODAL FOR REFRESH BUTTON */}
            <Modal
              transparent
              visible={showRefreshPopup}
              animationType="fade"
              onRequestClose={() => setShowRefreshPopup(false)}
            >
              <View style={styles.popupOverlay}>
                <View style={styles.popupContent}>
                  <Text style={styles.popupTitle}>Waiting for Payment</Text>
                  <Text style={styles.popupText}>
                    Complete the M-Pesa prompt on your phone. If you don’t see it, tap below to check status.
                  </Text>

                  <Pressable
                    style={[styles.popupButton, { backgroundColor: colors.primary }]}
                    onPress={handleRefresh}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.card} />
                    ) : (
                      <Text style={styles.popupButtonText}>🔄 Refresh Payment Status</Text>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.popupCloseButton}
                    onPress={() => setShowRefreshPopup(false)}
                  >
                    <Text style={styles.popupCloseText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: { fontWeight: "700", color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  center: { alignItems: "center" },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  cardText: { marginTop: 6, color: colors.textSecondary, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: { color: colors.card, fontWeight: "700", fontSize: 12 },
  price: { marginTop: 6, fontWeight: "800", color: colors.primary },
  feature: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { marginLeft: 8, color: colors.text },
  sectionTitle: { fontWeight: "700", fontSize: 16, color: colors.text, marginBottom: 8 },
  label: { fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
  },
  hint: { marginTop: 6, color: colors.textSecondary, fontSize: 13 },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    marginRight: 10,
  },
  methodTitle: { fontWeight: "700", color: colors.text },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  payButtonText: { color: colors.card, fontWeight: "800", fontSize: 16 },
  disabledButton: { opacity: 0.6 },
  smallMono: {
    marginTop: 6,
    color: colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
  },

  // POPUP STYLES
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 16,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  popupText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  popupButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  popupButtonText: {
    color: colors.card,
    fontWeight: '700',
    fontSize: 16,
  },
  popupCloseButton: {
    marginTop: 8,
  },
  popupCloseText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
});