import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import MpesaService from '@/app/integrations/mpesa/service';

export default function PaymentScreen() {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'stripe'>('mpesa');
  const [userId, setUserId] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'initiated' | 'pending' | 'completed' | 'failed'>('idle');
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    checkUser();
    setupPaymentStatusSubscription();
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user) {
        setUserId(user.id);
        
        // Check if user has already paid
        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('has_paid')
          .eq('auth_id', user.id)
          .single();
        
        if (userError) {
          console.error('Error checking payment status:', userError);
        } else if (userData?.has_paid) {
          Alert.alert(
            'Already Paid',
            'You have already completed payment. Redirecting to home...',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)/(home)') }]
          );
        }
      } else {
        Alert.alert('Error', 'Please log in to continue');
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error checking user:', error);
      Alert.alert('Error', 'Failed to verify user. Please try again.');
    }
  };

  const setupPaymentStatusSubscription = () => {
    if (!userId) return;

    const sub = MpesaService.subscribeToPaymentUpdates(
      userId,
      (payment) => {
        console.log('Payment status update:', payment);
        
        if (payment.status === 'completed' && payment.payment_completed) {
          setPaymentStatus('completed');
          setLoading(false);
          
          Alert.alert(
            'Payment Successful! 🎉',
            'Your payment has been processed successfully. Your account is now active!',
            [
              {
                text: 'Get Started',
                onPress: () => router.replace('/(tabs)/(home)'),
              },
            ]
          );
        } else if (payment.status === 'failed') {
          setPaymentStatus('failed');
          setLoading(false);
          
          Alert.alert(
            'Payment Failed',
            'Your payment was not successful. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    );

    setSubscription(sub);
  };

  const handleMpesaPayment = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid M-Pesa phone number (e.g., 0712345678)');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);
    setPaymentStatus('initiated');

    try {
      // Use the MpesaService to initiate STK Push
      const result = await MpesaService.initiateStkPush({
        phoneNumber: phoneNumber,
        amount: 3000,
        userId: userId,
        reference: 'HANNAS_CONNECT_SUBSCRIPTION'
      });

      if (result.success && result.data) {
        setCheckoutRequestId(result.data.CheckoutRequestID);
        setPaymentStatus('pending');
        
        Alert.alert(
          'STK Push Sent 📱',
          `Please check your phone for the M-Pesa prompt.\n\nCheckout Request ID: ${result.data.CheckoutRequestID}\n\nComplete the payment on your phone and return to the app.`,
          [
            {
              text: 'I\'ve Paid',
              onPress: () => checkPaymentStatus(result.data!.CheckoutRequestID),
            },
            {
              text: 'Check Status',
              onPress: () => checkPaymentStatus(result.data!.CheckoutRequestID),
            }
          ]
        );

      // Start monitoring payment status
      monitorPaymentStatus(result.data!.CheckoutRequestID);
    } else {
      throw new Error(result.error?.message || 'Failed to initiate STK Push');
    }
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      setPaymentStatus('failed');
      setLoading(false);
      
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to initiate M-Pesa payment. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const checkPaymentStatus = async (requestId: string) => {
    try {
      const result = await MpesaService.checkPaymentStatus(requestId);
      
      if (result.success && result.status) {
        if (result.status === 'completed') {
          setPaymentStatus('completed');
          Alert.alert(
            'Payment Completed! 🎉',
            'Your M-Pesa payment has been confirmed. Welcome to Hanna\'s Connect!',
            [
              {
                text: 'Get Started',
                onPress: () => router.replace('/(tabs)/(home)'),
              },
            ]
          );
        } else if (result.status === 'pending') {
          setPaymentStatus('pending');
          Alert.alert(
            'Payment Pending',
            'Your payment is still being processed. Please wait a moment and check again.',
            [{ text: 'OK' }]
          );
        } else {
          setPaymentStatus('failed');
          Alert.alert(
            'Payment Failed',
            'Your payment could not be completed. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('Payment status check error:', error);
    }
  };

  const monitorPaymentStatus = async (requestId: string) => {
    // Monitor payment status every 5 seconds for up to 2 minutes
    const maxAttempts = 24; // 2 minutes
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        console.log('Payment monitoring timeout');
        setLoading(false);
        return;
      }

      attempts++;

      try {
        const result = await MpesaService.checkPaymentStatus(requestId);
        
        if (result.success && result.status === 'completed') {
          setPaymentStatus('completed');
          setLoading(false);
          clearInterval(intervalId);
          
          Alert.alert(
            'Payment Successful! 🎉',
            'Your M-Pesa payment has been confirmed. Welcome to Hanna\'s Connect!',
            [
              {
                text: 'Get Started',
                onPress: () => router.replace('/(tabs)/(home)'),
              },
            ]
          );
        } else if (result.status === 'failed') {
          setPaymentStatus('failed');
          setLoading(false);
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    };

    const intervalId = setInterval(checkStatus, 5000);
    setLoading(false);
  };

  const handleStripePayment = async () => {
    Alert.alert(
      'Coming Soon',
      'Stripe payment integration is coming soon. Please use M-Pesa for now.'
    );
  };

  const handlePayment = () => {
    if (selectedMethod === 'mpesa') {
      handleMpesaPayment();
    } else {
      handleStripePayment();
    }
  };

  const getPaymentButtonText = () => {
    if (loading) return 'Processing...';
    if (paymentStatus === 'initiated') return 'STK Push Sent...';
    if (paymentStatus === 'pending') return 'Waiting for Payment...';
    if (paymentStatus === 'completed') return 'Payment Complete!';
    return 'Pay KSH 3,000';
  };

  const getPaymentButtonColor = () => {
    if (paymentStatus === 'completed') return colors.success;
    if (paymentStatus === 'failed') return colors.error;
    return colors.primary;
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Payment Status Card */}
          {paymentStatus !== 'idle' && (
            <View style={styles.statusCard}>
              <IconSymbol 
                name={
                  paymentStatus === 'completed' ? 'checkmark.circle.fill' :
                  paymentStatus === 'failed' ? 'xmark.circle.fill' :
                  paymentStatus === 'pending' ? 'clock.fill' :
                  'phone.circle.fill'
                } 
                size={48} 
                color={
                  paymentStatus === 'completed' ? colors.success :
                  paymentStatus === 'failed' ? colors.error :
                  paymentStatus === 'pending' ? colors.accent :
                  colors.primary
                } 
              />
              <Text style={styles.statusTitle}>
                {
                  paymentStatus === 'completed' ? 'Payment Complete!' :
                  paymentStatus === 'failed' ? 'Payment Failed' :
                  paymentStatus === 'pending' ? 'Awaiting Payment' :
                  'STK Push Initiated'
                }
              </Text>
              <Text style={styles.statusText}>
                {
                  paymentStatus === 'completed' ? 'Your account is now active. Welcome to Hanna\'s Connect!' :
                  paymentStatus === 'failed' ? 'Please try payment again or contact support.' :
                  paymentStatus === 'pending' ? 'Please complete the payment on your phone.' :
                  'Please check your phone for the M-Pesa prompt.'
                }
              </Text>
              {checkoutRequestId && (
                <Text style={styles.requestId}>Request ID: {checkoutRequestId}</Text>
              )}
            </View>
          )}

          {/* Payment Info Card */}
          <View style={styles.infoCard}>
            <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
            <Text style={styles.infoTitle}>Almost There!</Text>
            <Text style={styles.infoText}>
              Complete your payment to unlock full access to Hanna's Connect
            </Text>
          </View>

          {/* Pricing Card */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>180-Day Access</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Best Value</Text>
              </View>
            </View>
            <Text style={styles.priceAmount}>KSH 3,000</Text>
            <Text style={styles.priceDescription}>Full access for 6 months</Text>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark" size={20} color={colors.success} />
                <Text style={styles.featureText}>Unlimited connections</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark" size={20} color={colors.success} />
                <Text style={styles.featureText}>Private messaging</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark" size={20} color={colors.success} />
                <Text style={styles.featureText}>Profile visibility</Text>
              </View>
              <View style={styles.featureItem}>
                <IconSymbol name="checkmark" size={20} color={colors.success} />
                <Text style={styles.featureText}>Auto-renewal if less than 3 matches</Text>
              </View>
            </View>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            
            <Pressable
              style={[
                styles.paymentMethodCard,
                selectedMethod === 'mpesa' && styles.paymentMethodCardSelected,
              ]}
              onPress={() => setSelectedMethod('mpesa')}
            >
              <View style={styles.paymentMethodInfo}>
                <View style={styles.paymentMethodIcon}>
                  <Text style={styles.paymentMethodEmoji}>📱</Text>
                </View>
                <View style={styles.paymentMethodDetails}>
                  <Text style={styles.paymentMethodName}>M-Pesa</Text>
                  <Text style={styles.paymentMethodDescription}>
                    Pay with your M-Pesa mobile money
                  </Text>
                </View>
              </View>
              {selectedMethod === 'mpesa' && (
                <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
              )}
            </Pressable>

            <Pressable
              style={[
                styles.paymentMethodCard,
                selectedMethod === 'stripe' && styles.paymentMethodCardSelected,
              ]}
              onPress={() => setSelectedMethod('stripe')}
            >
              <View style={styles.paymentMethodInfo}>
                <View style={styles.paymentMethodIcon}>
                  <Text style={styles.paymentMethodEmoji}>💳</Text>
                </View>
                <View style={styles.paymentMethodDetails}>
                  <Text style={styles.paymentMethodName}>Credit/Debit Card</Text>
                  <Text style={styles.paymentMethodDescription}>
                    Pay with Visa, Mastercard, or Amex
                  </Text>
                </View>
              </View>
              {selectedMethod === 'stripe' && (
                <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
              )}
            </Pressable>
          </View>

          {/* M-Pesa Phone Number Input */}
          {selectedMethod === 'mpesa' && paymentStatus === 'idle' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>M-Pesa Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0712345678"
                placeholderTextColor={colors.textSecondary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <Text style={styles.inputHint}>
                Enter the phone number registered with M-Pesa
              </Text>
            </View>
          )}

          {/* Terms */}
          <View style={styles.termsContainer}>
            <IconSymbol name="info" size={20} color={colors.textSecondary} />
            <Text style={styles.termsText}>
              By proceeding, you agree to our Terms of Service and Privacy Policy. 
              Your subscription will be valid for 180 days.
            </Text>
          </View>
        </ScrollView>

        {/* Payment Button */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={loading || paymentStatus === 'completed'}
          >
            {loading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Text style={styles.payButtonText}>{getPaymentButtonText()}</Text>
                <IconSymbol name="arrow.forward" size={20} color={colors.card} />
              </>
            )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  requestId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pricingCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    boxShadow: '0px 4px 12px rgba(63, 81, 181, 0.2)',
    elevation: 4,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.card,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  priceDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  paymentMethodCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  paymentMethodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodEmoji: {
    fontSize: 24,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  termsContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    boxShadow: '0px 4px 12px rgba(63, 81, 181, 0.3)',
    elevation: 4,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
  },
  payButtonDisabled: {
    backgroundColor: colors.disabled,
  },
});