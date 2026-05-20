/**
 * Payment Screen Integration Helper
 * 
 * This file shows how to integrate the new Paystack STK Push functionality
 * into your existing payment-new.tsx screen
 */

import PaystackService from '@/app/integrations/paystack/service';
import { Platform, Alert } from 'react-native';

/**
 * Enhanced payment handler for payment-new.tsx
 * 
 * Usage in your payment screen:
 * 
 * const handlePaystackPayment = async () => {
 *   const result = await initiatePaystackPayment(
 *     userEmail,
 *     selectedPlan.price,
 *     userId,
 *     phoneNumber
 *   );
 * };
 */

export interface PaystackPaymentConfig {
  email: string;
  amount: number; // in currency units (will be converted to kobo)
  userId: string;
  phoneNumber?: string;
  planName?: string;
  currency?: string;
}

export interface PaystackPaymentResult {
  success: boolean;
  reference?: string;
  error?: string;
  message?: string;
}

/**
 * Initiate Paystack payment with STK push support
 */
export async function initiatePaystackPayment(
  config: PaystackPaymentConfig
): Promise<PaystackPaymentResult> {
  try {
    if (!config.email || !config.amount || !config.userId) {
      return {
        success: false,
        error: 'Missing required payment information',
      };
    }

    console.log('🔄 Initiating Paystack payment...', {
      platform: Platform.OS,
      amount: config.amount,
      email: config.email,
    });

    // Convert amount to kobo/cents (multiply by 100)
    const amountInKobo = Math.round(config.amount * 100);

    // Create charge request
    const chargeRequest = {
      email: config.email,
      amount: amountInKobo,
      userId: config.userId,
      phoneNumber: config.phoneNumber,
      currency: config.currency || 'KES',
      reference: `CONNECT_${Date.now()}`,
    };

    // Use STK push on Android, standard charge on other platforms
    const result = Platform.OS === 'android'
      ? await PaystackService.initiateStkPush(chargeRequest)
      : await PaystackService.initiateCharge(chargeRequest);

    if (result.success && result.data?.reference) {
      console.log('✅ Payment initiated successfully');
      console.log('📋 Transaction Reference:', result.data.reference);

      // For iOS and web, open authorization URL
      if (result.data?.authorization_url && Platform.OS !== 'android') {
        console.log('🌐 Opening payment URL in browser...');
        const urlOpened = await PaystackService.openPaymentUrl(
          result.data.authorization_url
        );
        
        if (!urlOpened) {
          return {
            success: false,
            error: 'Could not open payment URL',
          };
        }
      }

      return {
        success: true,
        reference: result.data.reference,
        message: result.message || 'Payment initiated successfully',
      };
    } else {
      console.error('❌ Payment failed:', result.error);
      return {
        success: false,
        error: result.error?.message || 'Failed to initiate payment',
        message: result.message,
      };
    }
  } catch (error: any) {
    console.error('🚨 Unexpected error during payment:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Poll for payment status
 */
export async function pollPaymentStatus(
  reference: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<PaystackPaymentResult> {
  let attempts = 0;

  return new Promise((resolve) => {
    const pollInterval = setInterval(async () => {
      attempts++;
      console.log(`🔍 Checking payment status (attempt ${attempts}/${maxAttempts})...`);

      const status = await PaystackService.checkPaymentStatus(reference);

      if (status.success) {
        clearInterval(pollInterval);
        
        if (status.status === 'completed') {
          console.log('✅ Payment completed successfully');
          resolve({
            success: true,
            reference,
            message: 'Payment completed successfully',
          });
        } else if (status.status === 'failed') {
          console.log('❌ Payment failed');
          resolve({
            success: false,
            error: 'Payment was declined',
            reference,
          });
        }
      }

      // Stop polling after max attempts
      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        console.log('⏱️ Polling timeout - payment status unknown');
        resolve({
          success: false,
          error: 'Payment status check timed out',
          reference,
        });
      }
    }, intervalMs);
  });
}

/**
 * Complete payment flow
 */
export async function completePaymentFlow(
  config: PaystackPaymentConfig
): Promise<PaystackPaymentResult> {
  try {
    // Step 1: Initiate payment
    const initResult = await initiatePaystackPayment(config);

    if (!initResult.success) {
      Alert.alert('Payment Failed', initResult.error || 'Failed to initiate payment');
      return initResult;
    }

    // Step 2: Poll for status (on Android STK push)
    if (Platform.OS === 'android' && initResult.reference) {
      console.log('⏳ Waiting for payment confirmation...');
      const statusResult = await pollPaymentStatus(initResult.reference);

      if (statusResult.success) {
        Alert.alert('Success! ✅', 'Your payment has been processed');
      } else {
        Alert.alert('Payment Status', statusResult.error || 'Please check your transaction');
      }

      return statusResult;
    }

    // Step 3: For iOS/web, payment happens in browser
    if (Platform.OS !== 'android') {
      Alert.alert(
        'Complete Payment',
        'Complete your payment in the browser window that opened'
      );
    }

    return initResult;
  } catch (error: any) {
    console.error('Payment flow error:', error);
    return {
      success: false,
      error: error.message || 'Payment flow failed',
    };
  }
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency: string = 'KES'): string {
  const formatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
  });
  return formatter.format(amount);
}

/**
 * Handler for payment button in UI
 * 
 * Example usage in JSX:
 * 
 * <Pressable onPress={() => handlePaymentButtonPress()} style={styles.payButton}>
 *   <Text style={styles.payButtonText}>Pay Now</Text>
 * </Pressable>
 */
export async function handlePaymentButtonPress(
  config: PaystackPaymentConfig,
  onSuccess?: (reference: string) => void,
  onError?: (error: string) => void
) {
  try {
    const result = await completePaymentFlow(config);

    if (result.success && result.reference) {
      onSuccess?.(result.reference);
    } else {
      onError?.(result.error || 'Payment failed');
    }
  } catch (error: any) {
    console.error('Button press error:', error);
    onError?.(error.message || 'An error occurred');
  }
}
