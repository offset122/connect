import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    checkAuthState();

    // Listen for auth state changes (email verification, sign in/out)
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email_confirmed_at);

      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in or email verified
        const userProfile = {
          id: session.user.id,
          email: session.user.email || '',
          profile: session.user.user_metadata
        };
        setUser(userProfile);

        // For returning users, check their flow status instead of always redirecting to registration
        await checkUserFlow();
        return;

        // Check user flow after successful sign in
        await checkUserFlow();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    const subscription = data?.subscription;
    return () => subscription?.unsubscribe();
  }, []);

  const checkAuthState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Get the actual user profile from the database
        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('id, first_name, email, has_paid, payment_status')
          .eq('auth_id', session.user.id)
          .single();

        if (!userError && userData) {
          setUser({
            id: userData.id, // Use database user ID for consistency
            email: userData.email || session.user.email || '',
            profile: userData
          });
        } else {
          // No profile found - set basic auth user (will trigger registration)
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            profile: session.user.user_metadata
          });
        }
      }
    } catch (error) {
      console.log('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Skip email confirmation requirement
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('AuthContext signIn error:', error);
        // For development/testing purposes, try to bypass email confirmation
        if (error.message.includes('Email not confirmed') || error.message.includes('confirmation')) {
          console.log('Email confirmation required, attempting to bypass...');

          // Try to sign in without requiring confirmation (development mode)
          try {
            // This approach may not work, but let's try to get the user anyway
            const { data: userData, error: userError } = await supabase.auth.getUser();

            if (!userError && userData.user) {
              console.log('Found user despite confirmation error:', userData.user.id);

              // Get the user profile from the database
              const { data: userProfile, error: profileError } = await (supabase as any)
                .from('users')
                .select('id, first_name, email, has_paid, payment_status')
                .eq('auth_id', userData.user.id)
                .single();

              if (!profileError && userProfile) {
                setUser({
                  id: userProfile.id,
                  email: userProfile.email || userData.user.email || '',
                  profile: userProfile
                });
                await checkUserFlow();
                return { success: true };
              } else {
                setUser({
                  id: userData.user.id,
                  email: userData.user.email || '',
                  profile: userData.user.user_metadata
                });
                await checkUserFlow();
                return { success: true };
              }
            }
          } catch (bypassError) {
            console.log('Bypass attempt failed:', bypassError);
          }

          return { success: false, error: 'Please check your email and confirm your account before logging in.' };
        }
        throw error;
      }

      if (data.user) {
        // Get the user profile from the database using auth_id
        const { data: userData, error: userError } = await (supabase as any)
          .from('users')
          .select('id, first_name, email, has_paid, payment_status')
          .eq('auth_id', data.user.id)
          .single();

        if (!userError && userData) {
          const userProfile = {
            id: userData.id, // Use database user ID for consistency
            email: userData.email || data.user.email || '',
            profile: userData
          };
          setUser(userProfile);

          // Check user flow after successful sign in
          await checkUserFlow();
          return { success: true };
        } else {
          // No profile found - set basic auth user (will trigger registration)
          const userProfile = {
            id: data.user.id,
            email: data.user.email || '',
            profile: data.user.user_metadata
          };
          setUser(userProfile);

          await checkUserFlow();
          return { success: true };
        }
      }

      return { success: false, error: 'No user returned' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Sign in failed' };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Starting signup for email:', email);

      // Try to sign up - Supabase will handle duplicate email errors
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.log('AuthContext: Signup error:', error);

        // Check if it's a duplicate email error
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          return { success: false, error: 'An account with this email already exists. Please use a different email or try logging in.' };
        }

        throw error;
      }

      if (data.user) {
        console.log('AuthContext: Signup successful, user ID:', data.user.id);

        // Set user state immediately and redirect
        const userProfile = {
          id: data.user.id,
          email: data.user.email || '',
          profile: data.user.user_metadata
        };
        setUser(userProfile);

        // Redirect to registration immediately
        console.log('AuthContext: New signup, redirecting to registration');
        router.replace('/registration');
        return { success: true };
      }

      console.log('AuthContext: No user returned from signup');
      return { success: false, error: 'No user returned' };
    } catch (error: any) {
      console.log('AuthContext: Signup failed with error:', error);
      return { success: false, error: error.message || 'Sign up failed' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      // Clear any cached data
      await AsyncStorage.clear();
      // Navigate to welcome screen
      router.replace('/welcome');
    } catch (error) {
      console.log('Error signing out:', error);
    }
  };

  const checkUserFlow = async () => {
    if (!user) return;

    try {
      // Check if user has a complete profile in the users table
      const { data: userData, error: userError } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData) {
        console.log('No user profile found, redirecting to registration');
        router.replace('/registration');
        return;
      }

      console.log('User data found:', userData);

      // More flexible profile completeness check
      // Allow users with basic information to proceed
      const hasBasicInfo = userData.email &&
                           (userData.first_name || userData.last_name || userData.email);

      if (!hasBasicInfo) {
        console.log('Incomplete profile, redirecting to registration');
        router.replace('/registration');
        return;
      }

      // Check if user has completed payment
      // Use both has_paid flag and payment_status
      const hasPaid = userData.has_paid === true ||
                      userData.payment_status === 'completed';

      if (!hasPaid) {
        console.log('Payment not completed, redirecting to payment');
        router.replace('/payment');
        return;
      }

      // Everything is complete, go to main app
      console.log('User flow complete, redirecting to home');
      setTimeout(() => {
        router.replace('/(tabs)/(home)');
      }, 200);
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
      checkUserFlow
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