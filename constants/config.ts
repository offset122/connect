/**
 * App Configuration
 * Central location for app-wide constants and configuration
 */

export const APP_CONFIG = {
  // App Identity
  APP_NAME: 'Hannas Connect',
  APP_SCHEME: 'hannasconnect',
  
  // Deep Links
  DEEP_LINKS: {
    RESET_PASSWORD: 'hannasconnect://reset-password',
    // Web fallback - uses web URL for browser-based reset
    WEB_RESET_PASSWORD: 'https://hannasconnect.co.ke/reset-password',
    // Supabase auth callback URL (must be configured in Supabase dashboard)
    // Web uses https, mobile uses custom scheme so the app intercepts it
    SUPABASE_REDIRECT: 'https://hannasconnect.co.ke/auth/callback',
    SUPABASE_REDIRECT_MOBILE: 'hannasconnect://auth/callback',
  },
  
  // Validation Rules
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
  },
  
  // Timeouts (in milliseconds)
  REQUEST_TIMEOUT: 30000,
  
  // Feature Flags
  FEATURES: {
    TWO_FACTOR_AUTH: false,
    BIOMETRIC_AUTH: false,
    REQUIRE_PAYMENT: true, // Set to false for free testing
  },
} as const;

export default APP_CONFIG;
