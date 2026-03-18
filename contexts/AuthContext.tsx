import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import APP_CONFIG from '../constants/config';

interface User {
  id: string;
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
    // Check for existing session and set initial user/loading state
    checkAuthState();

    // Listen for auth state changes (email verification, sign in/out)
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        // When signed in via listener (e.g., email confirmation), reload state and check flow
        console.log('Auth state changed: SIGNED_IN - checking user flow...');
        const userProfile = {
          id: session.user.id,
          email: session.user.email || '',
          profile: session.user.user_metadata
        };
        setUser(userProfile);
        
        // This is the crucial step: check user flow after ANY successful sign-in
        await checkUserFlow(userProfile.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        router.replace('/welcome');
      }
    });

    const subscription = data?.subscription;
    return () => subscription?.unsubscribe();
  }, []);

  // --- 2. Resolve initial auth state and profile ---
  const checkAuthState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const authUserId = session.user.id;
        
        // Try to get the actual user profile from the database
        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('id, first_name, email, has_paid, payment_status')
          .eq('auth_id', authUserId)
          .single();

        let resolvedUser: User;

        if (!userError && userData) {
          console.log('Found user profile in database:', userData);
          resolvedUser = {
            id: userData.id, // Use database user ID for consistency
            email: userData.email || session.user.email || '',
            profile: userData
          };
        } else {
          console.log('No user profile found in database, setting basic auth user');
          // No profile found - set basic auth user (will trigger registration)
          resolvedUser = {
            id: authUserId,
            email: session.user.email || '',
            profile: session.user.user_metadata
          };
        }
        
        setUser(resolvedUser);
        // Direct to the correct place *after* resolving the user state
        await checkUserFlow(resolvedUser.id);
        
      } else {
        // No session found, redirect to welcome
        router.replace('/welcome');
      }
    } catch (error) {
      console.log('Error checking auth state:', error);
      router.replace('/welcome');
    } finally {
      // Set loading to false once the initial check and routing is complete
      setLoading(false);
    }
  };

  // --- 3. Sign In Logic ---
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('AuthContext signIn error:', error);
        // Handle unconfirmed email specifically
        if (error.message.includes('Email not confirmed') || error.message.includes('confirmation')) {
          return { success: false, error: 'Please check your email and confirm your account before logging in.' };
        }
        throw error;
      }

      if (data.user) {
        // Use the auth listener (onAuthStateChange) to handle user state and flow, 
        // as it fires reliably after sign-in.
        return { success: true };
      }

      return { success: false, error: 'No user returned after sign in' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign in failed' };
    }
  };

  // --- 4. Sign Up Logic ---
  const signUp = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Starting signup for email:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.log('AuthContext: Signup error:', error);
        if (error.message.includes('already registered')) {
          return { success: false, error: 'An account with this email already exists. Please use a different email or try logging in.' };
        }
        throw error;
      }

      if (data.user) {
        console.log('AuthContext: Signup successful, user ID:', data.user.id);
        // On successful signup, redirect based on payment requirement
        if (APP_CONFIG.FEATURES.REQUIRE_PAYMENT) {
          router.replace('/payment-new' as any);
        } else {
          router.replace('/registration' as any);
        }
        return { success: true, requiresConfirmation: true };
      }

      return { success: false, error: 'No user returned from signup' };
    } catch (error: any) {
      console.log('AuthContext: Signup failed with error:', error);
      return { success: false, error: error.message || 'Sign up failed' };
    }
  };

  // --- 5. Sign Out Logic ---
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

  // --- 6. Centralized Flow Check for Redirection ---
  const checkUserFlow = async (id?: string) => {
    // Use the ID passed in or the current user state
    const currentId = id || user?.id;
    if (!currentId) return;

    try {
      // Check if user has a complete profile in the users table
      const { data: userData, error: userError } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('auth_id', currentId)
        .maybeSingle();

      // No profile found - redirect based on payment requirement
      if (userError || !userData) {
        console.log('No user profile found, redirecting');
        if (APP_CONFIG.FEATURES.REQUIRE_PAYMENT) {
          router.replace('/payment-new' as any);
        } else {
          router.replace('/registration' as any);
        }
        return;
      }

      console.log('User data found:', userData);

      // Update AuthContext user state with database profile
      setUser(prev => ({
        id: userData.id,
        email: userData.email,
        profile: userData
      }));

      // Check if user has completed payment (or skip if payment disabled)
      const hasPaid = !APP_CONFIG.FEATURES.REQUIRE_PAYMENT || userData.has_paid === true || userData.payment_status === 'completed';

      if (!hasPaid) {
        console.log('Payment not completed, redirecting to payment');
        router.replace('/payment-new' as any); 
        return;
      }

      // Payment complete but profile incomplete - check if registration is done
      // If first_name is missing, assume registration is incomplete
      if (!userData.first_name || !userData.age) {
        console.log('Payment complete but registration incomplete, redirecting to registration');
        router.replace('/registration');
        return;
      }

      // Everything is complete, go to main app
      console.log('User flow complete, redirecting to home');
      setTimeout(() => {
        router.replace('/(tabs)/(home)');
      }, 100); // Small delay to ensure router navigation registers
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
      setIsResettingPassword
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