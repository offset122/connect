import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const HIDDEN_SCREENS = new Set([
  '/call/voice-call',
  '/call/video-call',
  '/login',
  '/signup',
  '/welcome',
  '/index',
  '/registration',
  '/reset-password',
  '/email-confirmation',
  '/payment-new',
  '/connections',
]);

export default function GlobalNotificationButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { user } = useAuth(); // ✅ Always called at top level — never inside try/catch

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/notifications');
  }, [router]);

  if (HIDDEN_SCREENS.has(pathname) || !user) {
    return null;
  }

  return (
    <View style={styles.rootContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.8}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <View style={styles.iconWrapper}>
          <IconSymbol name="bell.fill" size={22} color="#FFFFFF" />
          <View style={[styles.badge, unreadCount === 0 && styles.badgeZero]}>
            <Text style={styles.badgeText}>
              {unreadCount > 20 ? '20+' : unreadCount}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 30,
    right: 16,
    zIndex: 999999,
    elevation: 25,
  },
  container: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    paddingHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  badgeZero: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderColor: 'rgba(255,255,255,0.6)',
    shadowOpacity: 0,
    elevation: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 12,
  },
});