/**
 * Paystack Charge Service
 * Frontend integration for Paystack payments via Supabase Edge Functions
 * Includes Android SDK integration for STK push payments
 */

import { supabase } from '../supabase/client';
import { Platform, Linking } from 'react-native';
import { isPaystackModuleAvailable } from './android-native';

// NOTE: Do not grab `PaystackModule` at module load time. In some RN/Expo
// lifecycles the native modules may not be present immediately. Resolve the
// native module dynamically at call time using `isPaystackModuleAvailable()`.

// ----------------------------------------------------------------------
// *** FIX 1: UPDATE ChargeRequest to include currency and phoneNumber ***
// ----------------------------------------------------------------------
interface ChargeRequest {
  email: string;
  amount: number; // in smallest currency unit (kobo) or as agreed with the Edge Function
  userId: string;
  reference?: string;
  currency?: string;     // <-- ADDED THIS FIELD
  phoneNumber?: string;  // <-- ADDED THIS FIELD
  accessCode?: string;   // <-- ADDED FOR STK PUSH
  redirect_url?: string; // <-- ADDED FOR REDIRECT URL
}

interface StructuredError {
  code?: string;
  message?: string;
  details?: any; // Added for better error propagation
}

interface ChargeResponse {
  success: boolean;
  data?: {
    reference: string;
    authorization_url?: string;
    access_code?: string;
  };
  error?: StructuredError;
  message?: string;
}

// Updated return type for consistency with structured errors
interface PaymentStatusCheckResponse {
  success: boolean;
  status?: 'pending' | 'completed' | 'failed';
  data?: any;
  error?: StructuredError;
}

export class PaystackService {
  private static readonly CHARGE_FUNCTION = 'paystack-charge';
  private static readonly STK_PUSH_FUNCTION = 'paystack-stk-push';

  /**
   * Initiate a Paystack charge via Supabase Edge Function
   */
  static async initiateCharge(request: ChargeRequest): Promise<ChargeResponse> {
    try {
      if (!request.email) {
        return { success: false, error: { message: 'Email is required for Paystack payment' } };
      }

      const { data, error } = await supabase.functions.invoke(this.CHARGE_FUNCTION, {
        body: {
          email: request.email,
          amount: request.amount,
          userId: request.userId,
          reference: request.reference || `CONNECT_${Date.now()}`,
          // ----------------------------------------------------------------------
          // *** FIX 2: PASS currency and phoneNumber to the Edge Function ***
          // ----------------------------------------------------------------------
          currency: request.currency,
          phoneNumber: request.phoneNumber,
          redirect_url: request.redirect_url,
        }
      });

      // --- Handle non-2xx Edge Function errors gracefully ---
      if (error) {
        console.error('Edge function error (non-2xx status):', error);
        
        // Return the error directly without throwing, preventing the generic catch block
        return {
          success: false,
          error: {
            message: error.message || 'Failed to initiate Paystack charge: Edge Function failed to execute.',
            code: 'FUNCTION_HTTP_ERROR',
            details: (error as any).details || (error as any).context // Attempt to retrieve more context if possible
          }
        };
      }
      
      // --- Handle application-level Paystack API failure (200 status with error payload) ---
      if (!data?.success) {
        console.error('Paystack API failure (from Edge Function payload):', data?.error);
        
        // Return the error structure passed back by the Edge Function
        return {
          success: false,
          error: data?.error || { message: 'Paystack charge initiation failed (No error details provided).' },
          message: data?.message
        };
      }

      // Success case
      return {
        success: true,
        data: data.data,
        message: data.message || 'Paystack charge initiated successfully'
      };
    } catch (error: any) {
      // This catch block is now primarily for unexpected network errors or configuration issues
      console.error('Paystack initiation error:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Network error during charge initiation'
        }
      };
    }
  }

  /**
   * Initiate Paystack STK Push for Android (Mobile Money)
   * Uses web-based STK push (native SDK disabled for now)
   */
  static async initiateStkPush(request: ChargeRequest): Promise<ChargeResponse> {
    try {
      // TEMPORARY FIX: Always use web-based charge initialization
      // Native Android SDK requires additional setup (see PAYSTACK_ANDROID_SETUP.md)
      console.log('Initiating Paystack charge (web-based STK Push)');
      return await this.initiateCharge(request);

      // TODO: Enable native Android SDK when properly configured
      // if (Platform.OS === 'android' && isPaystackModuleAvailable()) {
      //   console.log('Initiating Paystack STK Push via Android SDK');
      //   return await this.initiateStkPushNative(request);
      // }

    } catch (error: any) {
      console.error('STK Push initiation error:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to initiate STK push payment',
          code: 'STK_PUSH_ERROR'
        }
      };
    }
  }

  /**
   * Native Android SDK implementation for STK Push
   */
  private static async initiateStkPushNative(request: ChargeRequest): Promise<ChargeResponse> {
    try {
      // Resolve the native module at runtime to ensure it's present and
      // avoid import-time undefined values.
      const { NativeModules } = require('react-native');
      const PaystackModule = NativeModules?.PaystackModule;

      if (!PaystackModule) {
        throw new Error('Paystack Android module not available at runtime');
      }

      const accessCode = request.accessCode || await this.getAccessCode(request);

      // Call native Paystack module
      const result = await PaystackModule.startStkPush({
        accessCode,
        email: request.email,
        amount: request.amount,
        reference: request.reference || `CONNECT_${Date.now()}`,
        publicKey: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
      });

      if (result?.success) {
        return {
          success: true,
          data: {
            reference: result.reference,
            access_code: accessCode,
          },
          message: 'STK Push payment initiated successfully (native)'
        };
      }

      return {
        success: false,
        error: {
          message: result?.message || 'STK Push payment failed',
          code: 'STK_PUSH_FAILED'
        }
      };

    } catch (error: any) {
      console.error('Native STK Push error:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Failed to initiate native STK push',
          code: 'NATIVE_STK_ERROR'
        }
      };
    }
  }

  /**
   * Get access code from Paystack for STK Push
   */
  private static async getAccessCode(request: ChargeRequest): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke(this.STK_PUSH_FUNCTION, {
        body: {
          email: request.email,
          amount: request.amount,
          userId: request.userId,
          reference: request.reference || `CONNECT_${Date.now()}`,
          currency: request.currency || 'KES',
          phoneNumber: request.phoneNumber,
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get access code');
      }

      return data?.data?.access_code || data?.access_code || '';

    } catch (error: any) {
      console.error('Failed to get access code:', error);
      throw error;
    }
  }

  /**
   * Open payment URL in browser (web/fallback)
   */
  static async openPaymentUrl(authorizationUrl: string): Promise<boolean> {
    try {
      const supported = await Linking.canOpenURL(authorizationUrl);
      
      if (supported) {
        await Linking.openURL(authorizationUrl);
        return true;
      } else {
        console.error('Cannot open URL:', authorizationUrl);
        return false;
      }
    } catch (error: any) {
      console.error('Error opening payment URL:', error);
      return false;
    }
  }

  /**
   * Check payment status in `user_payments` table using transaction reference
   */
  static async checkPaymentStatus(reference: string): Promise<PaymentStatusCheckResponse> {
    try {
      const { data, error } = await supabase
        .from('user_payments')
        .select('*')
        .eq('transaction_id', reference)
        .maybeSingle();

      if (error) {
        console.error('Failed to query payment record:', error);
        // Refactored to return structured error immediately instead of throwing
        return {
          success: false,
          error: {
            message: error.message || 'Failed to query payment record.',
            code: error.code || 'DB_QUERY_ERROR',
          }
        };
      }

      return {
        success: true,
        status: data?.status,
        data,
      };

    } catch (error: any) {
      console.error('Paystack status check error:', error);
      return { 
        success: false, 
        error: {
          message: error.message || 'Failed to check payment status',
          code: 'UNHANDLED_ERROR'
        }
      };
    }
  }

  /**
   * Subscribe to payment status updates (real-time) for a user
   */
  static subscribeToPaymentUpdates(
    userId: string,
    callback: (payment: any) => void
  ): { unsubscribe: () => void } {
    const subscription = supabase
      .channel('user_payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_payments',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // payload.record should contain updated payment row
          callback(payload.record);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(subscription);
      }
    };
  }
}

export default PaystackService;