import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from './types';
// @ts-ignore: Missing type declarations for '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://dbvsexpcrojtnriqfbwa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidnNleHBjcm9qdG5yaXFmYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzQyMzYsImV4cCI6MjA3NzAxMDIzNn0.e3bGdg7pvM0r6eF82oTlhJYRuuQcYnvYva_232gj2y4";

// Check if we're running in a browser environment
const isWeb = typeof window !== 'undefined' && Platform.OS === 'web';

// On web: use localStorage so Supabase uses implicit flow (hash-based tokens)
// On mobile: use AsyncStorage for persistent secure storage
const storage = isWeb
  ? {
      getItem: (key: string) => {
        try {
          return Promise.resolve(localStorage.getItem(key));
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore storage errors (e.g., quota exceeded)
        }
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore errors
        }
        return Promise.resolve();
      },
    }
  : AsyncStorage;

// Optimized auth options - disable some features on web for faster load
const authOptions = isWeb
  ? {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit' as const,
    }
  : {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce' as const,
    };

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: authOptions,
})

// Helper function to get avatar URL
export const getAvatarUrlFromStorage = (filename: string): string => {
  try {
    const { data } = supabase.storage.from('photos').getPublicUrl(filename);
    return data?.publicUrl || '';
  } catch (error) {
    console.error('Error generating avatar URL:', error);
    return '';
  }
};

// Helper function to list avatar files in storage
export const listAvatarFiles = async () => {
  try {
    const { data, error } = await supabase.storage.from('photos').list();
    if (error) {
      console.error('Error listing avatar files:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Exception listing avatar files:', error);
    return null;
  }
};
