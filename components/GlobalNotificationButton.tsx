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
          <IconSymbol name="bell.fill" size={26} color="#FFFFFF" />

          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
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
    top: -10,
    right: -10,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 13,
  },
});