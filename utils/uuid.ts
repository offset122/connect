// utils/uuid.ts
// React Native compatible UUID generator
// Replaces uuid library which requires crypto.getRandomValues()

import { Platform } from 'react-native';

/**
 * Generates a v4 UUID compatible with React Native
 * Uses Math.random() as fallback for crypto.getRandomValues()
 */
export function generateUUID(): string {
  // Try to use crypto if available (web)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  
  // Fallback to Math.random() for React Native
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default generateUUID;