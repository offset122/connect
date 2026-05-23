import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { colors, responsiveStyles, BREAKPOINTS } from '../styles/commonStyles';
import { IconSymbol } from '../components/IconSymbol';
import safeBack from '../utils/safeRouter';
import { useWindowDimensions } from 'react-native';

// ─── Advanta SMS config (hardcoded for testing) ──────────────────────────────
const ADVANTA_APP_KEY = '780c26dc-6932-40b3-8a77-2f2e1352e06d';
const ADVANTA_PARTNER_ID = '14040';
const ADVANTA_SENDER_ID = "HANNA'S CN";


const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_S = 60; // seconds before user can resend

// ─── Helpers ──────────────────────────────────────────────────────────────────


/** Generate a 6-digit numeric OTP */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalise a Kenyan phone number to international format (2547XXXXXXXX).
 * Accepts: 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
 */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return '254' + digits.slice(1);
  }
  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return '254' + digits;
  }
  // Non-Kenyan numbers — pass through as-is if reasonable length
  if (digits.length >= 7 && digits.length <= 15) {
    return digits;
  }
  return null;
}

/** Send OTP via Advanta SMS */
async function sendOtpSms(phone: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const message = `Your Hannas Connect verification code is: ${otp}. It expires in 10 minutes. Do not share this code.`;

  const payload = {
    apikey: ADVANTA_APP_KEY,
    partnerID: ADVANTA_PARTNER_ID,
    mobile: phone,
    message,
    shortcode: ADVANTA_SENDER_ID,
  };

  console.log('Advanta SMS payload:', JSON.stringify(payload));

  try {
    const response = await fetch('https://quicksms.advantasms.com/api/services/sendotp/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Read raw text first — if the server returns HTML we get a useful error
    const raw = await response.text();
    console.log('Advanta SMS raw response:', raw);

    // Try to parse as JSON
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      // Server returned non-JSON (HTML error page) — surface the status
      return { ok: false, error: `Server error ${response.status}: ${raw.slice(0, 120)}` };
    }

    console.log('Advanta SMS response:', json);

    // Success: responses array with response-code 200
    if (json?.responses?.[0]?.['response-code'] === 200) {
      return { ok: true };
    }

    const description =
      json?.responses?.[0]?.['response-description'] ??
      json?.['response-description'] ??
      'SMS sending failed';
    return { ok: false, error: description };
  } catch (err: any) {
    console.error('Advanta SMS error:', err);
    return { ok: false, error: err.message ?? 'Network error sending SMS' };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhoneVerificationScreen() {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINTS.lg;
  const { user } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);
  const [step, setStep] = useState<'enter_phone' | 'enter_otp'>('enter_phone');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load any previously saved phone from AsyncStorage (set during signup)
  useEffect(() => {
    AsyncStorage.getItem('signupPhone').then((saved) => {
      if (saved) setPhone(saved);
    });
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_S);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const normalised = normalisePhone(phone.trim());
    if (!normalised) {
      showAlert('Invalid Number', 'Please enter a valid phone number (e.g. 0712345678).');
      return;
    }

    setLoading(true);
    try {
      const code = generateOtp();
      const result = await sendOtpSms(normalised, code);

      if (!result.ok) {
        showAlert('SMS Failed', result.error ?? 'Could not send verification code. Please try again.');
        return;
      }

      setGeneratedOtp(code);
      setOtpExpiry(Date.now() + OTP_EXPIRY_MS);
      setStep('enter_otp');
      startCooldown();

      // Save normalised phone so we can store it after verification
      await AsyncStorage.setItem('signupPhone', normalised);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showAlert('Invalid Code', 'Please enter the 6-digit code sent to your phone.');
      return;
    }

    if (!otpExpiry || Date.now() > otpExpiry) {
      showAlert('Code Expired', 'Your verification code has expired. Please request a new one.');
      setStep('enter_phone');
      return;
    }

    if (otp.trim() !== generatedOtp) {
      showAlert('Wrong Code', 'The code you entered is incorrect. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Persist the verified phone number on the user's Supabase record
      if (user?.id) {
        const normalised = normalisePhone(phone.trim()) ?? phone.trim();
        const { error } = await (supabase as any)
          .from('users')
          .update({
            phone_number: normalised,
            phone_verified: true,
          })
          .eq('auth_id', user.id);

        if (error) {
          console.warn('Could not save phone to DB (will retry later):', error.message);
          // Non-fatal — we still let the user proceed; phone is in AsyncStorage
        }
      }

      await AsyncStorage.setItem('phoneVerified', 'true');
      await AsyncStorage.removeItem('signupPhone');

      // Proceed to payment
      router.replace('/payment-new' as any);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtp('');
    await handleSendOtp();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={[styles.content, responsiveStyles.contentMaxWidth(isLarge)]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <Pressable style={styles.backButton} onPress={() => safeBack(router)}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircle}>
              <IconSymbol name="phone.fill" size={36} color={colors.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, responsiveStyles.title(isLarge)]}>
            Verify Your Phone
          </Text>
          <Text style={[styles.subtitle, responsiveStyles.subtitle(isLarge)]}>
            {step === 'enter_phone'
              ? 'Enter your phone number. We\'ll send a one-time code to confirm it\'s yours.'
              : `We sent a 6-digit code to ${phone}. Enter it below to continue.`}
          </Text>

          {step === 'enter_phone' ? (
            /* ── Phone input ── */
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 0712 345 678"
                  placeholderTextColor={colors.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!loading}
                />
              </View>

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </Pressable>
            </View>
          ) : (
            /* ── OTP input ── */
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor={colors.textSecondary}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                />
              </View>

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </Pressable>

              {/* Resend */}
              <Pressable
                style={[styles.resendButton, resendCooldown > 0 && styles.resendDisabled]}
                onPress={handleResend}
                disabled={resendCooldown > 0 || loading}
              >
                <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </Text>
              </Pressable>

              {/* Change number */}
              <Pressable
                style={styles.changeNumberButton}
                onPress={() => {
                  setStep('enter_phone');
                  setOtp('');
                  setGeneratedOtp('');
                }}
              >
                <Text style={styles.changeNumberText}>Change phone number</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  title: {
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otpInput: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendDisabled: {
    opacity: 0.5,
  },
  resendText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: colors.textSecondary,
  },
  changeNumberButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  changeNumberText: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
