import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import APP_CONFIG from '../constants/config';

// Public pages that don't require authentication
const PUBLIC_PAGES = [
  'privacy-policy',
  'terms-and-conditions',
  'support',
  'how-it-works',
  'disclaimer',
  'index',
  'welcome',
  'child-safety-standards',
];

interface User {
  id: string;       // Supabase AUTH uuid — never the database row id
  email: string;
  profile?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  checkUserFlow: () => Promise<void>;
  setIsResettingPassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // --- 1. INITIAL LOAD & LISTENER SETUP ---
  useEffect(() => {
    // Safely check for auth callback URL - guard against undefined window.location
    const isAuthCallback = typeof window !== 'undefined' && window.location && window.location.pathname && window.location.pathname.includes('auth/callback');
    
    if (isAuthCallback) {
      setLoading(false);
      return;
    }

    // Check if this is a public page that doesn't require authentication
    const isPublicPage = typeof window !== 'undefined' && window.location && window.location.pathname && PUBLIC_PAGES.some(page => window.location.pathname.includes(page));
    
    if (isPublicPage) {
      console.log('Public page detected, skipping auth check');
      setLoading(false);
      return;
    }

    checkAuthState();

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event — skipping flow check');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        const isCallback = typeof window !== 'undefined' && window.location && window.location.pathname && window.location.pathname.includes('auth/callback');
        if (isCallback) {
          return;
        }
        console.log('Auth state changed: SIGNED_IN - checking user flow...');
        // Always store the AUTH uuid, never the DB row id
        const userProfile: User = {
          id: session.user.id,           // ← auth uuid
          email: session.user.email || '',
          profile: session.user.user_metadata,
        };
        setUser(userProfile);
        // Don't await - let it run in background
        checkUserFlow(session.user.id).catch(err => 
          console.log('Background checkUserFlow error:', err)
        );
      } else if (event === 'SIGNED_OUT') {
        // Safely check for password reset flow - guard against undefined window.location
        const isPasswordResetFlow =
          typeof window !== 'undefined' &&
          window.location &&
          window.location.pathname &&
          window.location.pathname.includes('reset-password');

        setUser(null);
        if (!isPasswordResetFlow) {
          router.replace('/welcome');
        }
      }
    });

    const subscription = data?.subscription;
    return () => subscription?.unsubscribe();
  }, []);

  // --- 2. Resolve initial auth state ---
  const checkAuthState = async () => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 5000)
      );
      
      const sessionPromise = supabase.auth.getSession();
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

      if (session?.user) {
        const authUuid = session.user.id; // always the auth uuid

        // Query with timeout
        const userQueryPromise = supabase
          .from('users')
          .select('id, first_name, email, has_paid, payment_status')
          .eq('auth_id', authUuid)
          .maybeSingle();
          
        const userTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User query timeout')), 10000)
        );
        
        const { data: userData, error: userError } = await Promise.race([userQueryPromise, userTimeoutPromise]) as any;

        const resolvedUser: User = {
          id: authUuid,
          email: userData?.email || session.user.email || '',
          profile: userData ?? session.user.user_metadata,
        };

        setUser(resolvedUser);
        await checkUserFlow(authUuid);
      } else {
        // Check if this is a public page - if so, don't redirect to welcome
        const isPublicPage = PUBLIC_PAGES.some(page => window.location.pathname.includes(page));
        if (!isPublicPage) {
          router.replace('/welcome');
        }
      }
    } catch (error) {
      console.log('Error checking auth state:', error);
      // Don't block - just set loading to false and continue
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Sign In ---
  const signIn = async (email: string, password: string) => {
    try {
      // Clear any potentially stale session data from localStorage before signing in
      // This ensures that after a password reset, the old cached tokens don't interfere
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('sb-'))) {
              keysToRemove.push(key);
            }
          }
          if (keysToRemove.length > 0) {
            console.log('Clearing stale session keys before login:', keysToRemove);
            keysToRemove.forEach(key => localStorage.removeItem(key));
          }
        } catch (storageError) {
          console.log('Error clearing storage:', storageError);
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('confirmation')) {
          return { success: false, error: 'Please check your email and confirm your account before logging in.' };
        }
        throw error;
      }

      if (data.user) {
        // ✅ Force refresh session to ensure any password reset changes are recognized
        // This prevents stale session issues after password reset
        try {
          await supabase.auth.refreshSession();
        } catch (refreshError) {
          // Ignore refresh errors - main login succeeded
          console.log('Post-login session refresh:', refreshError);
        }
        return { success: true };
      }
      return { success: false, error: 'No user returned after sign in' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign in failed' };
    }
  };

  // --- 4. Sign Up ---
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'An account with this email already exists. Please use a different email or try logging in.' };
        }
        throw error;
      }

      if (data.user) {
        router.replace('/registration' as any);
        return { success: true, requiresConfirmation: true };
      }

      return { success: false, error: 'No user returned from signup' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign up failed' };
    }
  };

  // --- 5. Sign Out ---
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      await AsyncStorage.clear();
      router.replace('/welcome');
    } catch (error) {
      console.log('Error signing out:', error);
    }
  };

  // --- 6. Centralized Flow Check ---
  // Always receives / uses the Supabase AUTH uuid, never a DB row id.
  // Does NOT navigate on its own — returns a destination so the caller
  // decides when to navigate (avoids racing with RegistrationScreen).
  const checkUserFlow = async (authUuid?: string): Promise<void> => {
    const currentAuthId = authUuid || user?.id;
    if (!currentAuthId) return;

    try {
      // Add timeout for the query
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('auth_id', currentAuthId)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User query timeout')), 10000)
      );
      
      const { data: userData, error: userError } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (userError || !userData) {
        console.log('No user profile found, redirecting to registration');
        router.replace('/registration' as any);
        return;
      }

      console.log('User data found:', userData.id, userData.first_name);

      // Keep context in sync — store auth uuid, not DB row id
      setUser({
        id: currentAuthId,              // ← auth uuid
        email: userData.email,
        profile: userData,
      });

      const hasPaid =
        !APP_CONFIG.FEATURES.REQUIRE_PAYMENT ||
        userData.has_paid === true ||
        userData.payment_status === 'completed';

      if (!hasPaid) {
        console.log('Payment not completed, redirecting to payment');
        router.replace('/payment-new' as any);
        return;
      }

      if (!userData.first_name || !userData.age) {
        console.log('Registration incomplete, redirecting to registration');
        router.replace('/registration' as any);
        return;
      }

      // ✅ Profile complete — navigate to home (no setTimeout)
      console.log('User flow complete, redirecting to home');
      router.replace('/(tabs)/(home)');
    } catch (error) {
      console.log('Error checking user flow:', error);
      router.replace('/welcome');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      checkUserFlow,
      setIsResettingPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};