/**
 * Validation Utilities
 * Reusable validation functions for forms and user input
 */

import { APP_CONFIG } from '@/constants/config';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
}

/**
 * Validate email address format
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

/**
 * Validate password against requirements
 */
export const validatePassword = (password: string): ValidationResult => {
  const { PASSWORD_REQUIREMENTS } = APP_CONFIG;

  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    };
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one uppercase letter',
    };
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one lowercase letter',
    };
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one number',
    };
  }

  if (
    PASSWORD_REQUIREMENTS.requireSpecialChar &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    return {
      isValid: false,
      error: 'Password must contain at least one special character',
    };
  }

  return { isValid: true };
};

/**
 * Calculate password strength score and label
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;

  if (!password) {
    return { score: 0, label: 'Very Weak', color: '#EF4444' };
  }

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  // Cap at 4
  score = Math.min(score, 4);

  const strengthMap: Record<number, PasswordStrength> = {
    0: { score: 0, label: 'Very Weak', color: '#EF4444' },
    1: { score: 1, label: 'Weak', color: '#F59E0B' },
    2: { score: 2, label: 'Fair', color: '#FBBF24' },
    3: { score: 3, label: 'Good', color: '#84CC16' },
    4: { score: 4, label: 'Strong', color: '#10B981' },
  };

  return strengthMap[score];
};

/**
 * Validate password confirmation matches
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
};

/**
 * Get user-friendly error message for Supabase auth errors
 */
export const getAuthErrorMessage = (error: any): string => {
  const errorMessage = error?.message || '';

  // Map common Supabase errors to user-friendly messages
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or password';
  }
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please verify your email address first';
  }
  if (errorMessage.includes('Invalid link') || errorMessage.includes('expired')) {
    return 'This reset link has expired or has already been used. Please request a new one.';
  }
  if (errorMessage.includes('Same password')) {
    return 'New password must be different from your current password';
  }
  if (errorMessage.includes('rate limit')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }
  if (errorMessage.includes('User not found')) {
    return 'No account found with this email address';
  }

  // Return original message if no mapping found
  return errorMessage || 'An unexpected error occurred. Please try again.';
};
