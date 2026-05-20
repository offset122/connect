/**
 * Android Native Bridge for Paystack STK Push
 * This file defines the TypeScript interface for native Android Paystack module
 */

export interface PaystackAndroidConfig {
  publicKey: string;
  accessCode: string;
  email: string;
  amount: number;
  reference: string;
}

export interface PaystackAndroidResult {
  success: boolean;
  reference?: string;
  message?: string;
  transactionReference?: string;
  accessCode?: string;
}

export interface PaystackAndroidModule {
  /**
   * Initiate STK Push payment using Paystack Android SDK
   * @param config Payment configuration
   * @returns Promise with payment result
   */
  startStkPush(config: PaystackAndroidConfig): Promise<PaystackAndroidResult>;

  /**
   * Initiate Charge using Paystack Android SDK
   * @param config Payment configuration
   * @returns Promise with charge result
   */
  startCharge(config: PaystackAndroidConfig): Promise<PaystackAndroidResult>;

  /**
   * Get available payment methods
   * @returns Promise with list of payment methods
   */
  getPaymentMethods(): Promise<string[]>;
}

/**
 * Helper function to check if Paystack Android module is available
 */
export const isPaystackModuleAvailable = (): boolean => {
  try {
    const { NativeModules } = require('react-native');
    return !!NativeModules.PaystackModule;
  } catch {
    return false;
  }
};
