
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

export default function PaymentScreen() {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'stripe'>('mpesa');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user) {
        setUserId(user.id);
        
        // Check if user has already paid
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('has_paid')
          .eq('id', user.id)
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

  const handleMpesaPayment = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid M-Pesa phone number');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          amount: 3000,
          currency: 'KSH',
          payment_method: 'mpesa',
          status: 'pending',
          metadata: { phone_number: phoneNumber },
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      console.log('Payment record created:', paymentData);

      // In a real implementation, you would call an M-Pesa API here
      // For now, we'll simulate a successful payment
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update payment status to completed
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ 
          status: 'completed',
          transaction_id: `MPESA${Date.now()}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentData.id);

      if (updatePaymentError) throw updatePaymentError;

      // Update user's payment status and set account expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 180); // 180 days from now

      const { error: updateUserError } = await supabase
        .from('users')
        .update({ 
          has_paid: true,
          payment_date: new Date().toISOString(),
          account_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateUserError) throw updateUserError;

      Alert.alert(
        'Payment Successful! 🎉',
        'Your payment of KSH 3,000 has been received. Your account is now active for 180 days!',
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)/(home)'),
          },
        ]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Failed',
        'There was an error processing your payment. Please try again or contact support.'
      );
    } finally {
      setLoading(false);
    }
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

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <IconSymbol name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Payment Info Card */}
          <View style={styles.infoCard}>
            <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
            <Text style={styles.infoTitle}>Almost There!</Text>
            <Text style={styles.infoText}>
              Complete your payment to unlock full access to Hanna&apos;s Connect
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
                <Text style={styles.featureText}>Auto-renewal if &lt;3 matches</Text>
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
          {selectedMethod === 'mpesa' && (
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
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <Text style={styles.payButtonText}>Pay KSH 3,000</Text>
                <IconSymbol name="arrow-forward" size={20} color={colors.card} />
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
