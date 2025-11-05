/**
 * Mpesa STK Push Service
 * Frontend integration for Mpesa payments via Supabase Edge Functions
 */

import { supabase } from '@/app/integrations/supabase/client';

interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  userId: string;
  reference?: string;
}

interface StkPushResponse {
  success: boolean;
  data?: {
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    MerchantRequestID: string;
  };
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

export class MpesaService {
  private static readonly STK_PUSH_FUNCTION = 'mpesa-stk-push';
  private static readonly CALLBACK_FUNCTION = 'mpesa-callback';

  /**
   * Initiate STK Push payment
   */
  static async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    try {
      // Format phone number (ensure it starts with 254)
      const formattedPhone = this.formatPhoneNumber(request.phoneNumber);
      
      // Validate phone number
      if (!this.isValidPhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number format. Use format: 2547XXXXXXXX');
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(this.STK_PUSH_FUNCTION, {
        body: {
          phoneNumber: formattedPhone,
          amount: request.amount,
          userId: request.userId,
          reference: request.reference || 'HANNAS_CONNECT'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to initiate STK Push');
      }

      if (!data?.success) {
        throw new Error(data?.error?.message || 'STK Push initiation failed');
      }

      return {
        success: true,
        data: data.data,
        message: data.message || 'STK Push initiated successfully'
      };

    } catch (error: any) {
      console.error('STK Push error:', error);
      return {
        success: false,
        error: {
          code: 'MPESA_ERROR',
          message: error.message || 'Failed to initiate STK Push'
        }
      };
    }
  }

  /**
   * Check payment status by tracking ID
   */
  static async checkPaymentStatus(checkoutRequestId: string): Promise<{
    success: boolean;
    status?: 'pending' | 'completed' | 'failed';
    data?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_payments')
        .select('*')
        .eq('transaction_id', checkoutRequestId)
        .single();

      if (error) {
        throw new Error('Payment record not found');
      }

      return {
        success: true,
        status: data.status,
        data: data
      };

    } catch (error: any) {
      console.error('Payment status check error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check payment status'
      };
    }
  }

  /**
   * Format phone number to international format
   */
  private static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    }
    
    // If starts with 7, add 254
    if (cleaned.startsWith('7')) {
      return '254' + cleaned;
    }
    
    // If already starts with 254, return as is
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    
    // If it's a 9-digit number starting with 7, add 254
    if (cleaned.length === 9 && cleaned.startsWith('7')) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  private static isValidPhoneNumber(phone: string): boolean {
    // Check if it's a valid Kenyan mobile number
    const kenyanPhoneRegex = /^2547[0-9]{8}$/;
    return kenyanPhoneRegex.test(phone);
  }

  /**
   * Get Mpesa payment history for a user
   */
  static async getPaymentHistory(userId: string): Promise<{
    success: boolean;
    payments?: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('user_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        payments: data || []
      };

    } catch (error: any) {
      console.error('Payment history error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get payment history'
      };
    }
  }

  /**
   * Subscribe to payment status updates (real-time)
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
        callback
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(subscription);
      }
    };
  }
}

export default MpesaService;