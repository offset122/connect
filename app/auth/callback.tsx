import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/app/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';

export default function AuthCallback() {
  const router = useRouter();
  const { url: deepLinkUrl } = useLocalSearchParams<{ url?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (Platform.OS === 'web') {
      // With flowType:'implicit' + detectSessionInUrl:true, Supabase auto-processes
      // the hash fragment and fires PASSWORD_RECOVERY via onAuthStateChange
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth callback event:', event);
        if (event === 'PASSWORD_RECOVERY' && session) {
          clearTimeout(timeout);
          router.replace('/reset-password');
        }
      });

      timeout = setTimeout(() => {
        setError('This reset link is invalid or has expired.');
        setLoading(false);
      }, 5000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    } else {
      // Mobile: custom scheme deep link hannasconnect://auth/callback?code=...
      // URL is passed as a param from _layout.tsx deep link handler
      const handleMobileCallback = async () => {
        try {
          // Use URL from params (passed by _layout handler) or fall back to getInitialURL
          const rawUrl = deepLinkUrl || await Linking.getInitialURL();
          console.log('Mobile auth callback URL:', rawUrl);
          if (!rawUrl || typeof rawUrl !== 'string') throw new Error('No URL found');

          // Validate URL format before parsing
          if (!rawUrl.startsWith('hannasconnect://') && !rawUrl.startsWith('https://')) {
            console.log('Ignoring non-custom scheme URL:', rawUrl);
            setLoading(false);
            return;
          }

          const parsed = Linking.parse(rawUrl);
          if (!parsed || typeof parsed !== 'object') {
            throw new Error('Failed to parse URL');
          }
          const params: any = parsed.queryParams || {};

          // PKCE flow: exchange code for session
          if (params.code) {
            const { error } = await supabase.auth.exchangeCodeForSession(params.code);
            if (error) throw error;
            router.replace('/reset-password');
            return;
          }

          // Implicit fallback: access_token in params
          if (params.access_token && params.refresh_token && params.type === 'recovery') {
            const { error } = await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
            if (error) throw error;
            router.replace('/reset-password');
            return;
          }

          throw new Error('No valid auth params found');
        } catch (err) {
          console.error('Mobile auth callback error:', err);
          setError('This reset link is invalid or has expired.');
        } finally {
          setLoading(false);
        }
      };

      handleMobileCallback();
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Securing your session...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.link} onPress={() => router.replace('/reset-password')}>
          Request a new reset link
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  link: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});