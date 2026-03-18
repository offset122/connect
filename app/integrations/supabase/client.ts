import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
// @ts-ignore: Missing type declarations for '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://dbvsexpcrojtnriqfbwa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidnNleHBjcm9qdG5yaXFmYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzQyMzYsImV4cCI6MjA3NzAxMDIzNn0.e3bGdg7pvM0r6eF82oTlhJYRuuQcYnvYva_232gj2y4";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
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
