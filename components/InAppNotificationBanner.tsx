// components/InAppNotificationBanner.tsx
// Displays a slide-in banner at the top of the screen when a notification is
// received while the app is in the foreground (active state).

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { borderRadius, colors, shadows } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { inAppNotificationEmitter } from '@/utils/inAppNotificationEmitter';

interface BannerData {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, any>;
}

const DISPLAY_DURATION = 4500; // ms before auto-dismiss

export default function InAppNotificationBanner() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<BannerData | null>(null);

  const slideY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isVisible = useRef(false);

  // Track app state
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      appStateRef.current = s;
    });
    return () => sub.remove();
  }, []);

  const dismiss = () => {
    if (!isVisible.current) return;
    isVisible.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(slideY, { toValue: -200, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setBanner(null));
  };

  const show = (data: BannerData) => {
    // Reset position before showing
    slideY.setValue(-200);
    opacity.setValue(0);
    isVisible.current = true;

    setBanner(data);

    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(dismiss, DISPLAY_DURATION);
  };

  // Listen for direct emitter events (foreground — from NotificationContext)
  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    const unsub = inAppNotificationEmitter.subscribe((payload) => {
      if (payload.type === 'incoming_call') return;
      show(payload);
    });

    return () => unsub();
  }, [user]);

  // Listen for OS notification events (background → foreground transition)
  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    const sub = Notifications.addNotificationReceivedListener((received) => {
      // Only show when app is active (foreground)
      if (appStateRef.current !== 'active') return;

      const notifData = received.request.content.data as Record<string, any>;
      const type: string = notifData?.type ?? 'system';

      if (type === 'incoming_call') return;

      const title = received.request.content.title ?? 'New Notification';
      const body = received.request.content.body ?? '';

      show({
        id: received.request.identifier,
        title,
        body,
        type,
        data: notifData,
      });
    });

    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
}, [user]);

  const handlePress = () => {
    if (!banner) return;
    dismiss();

    const { type, data } = banner;
    const relatedUserId: string | undefined = data?.related_user_id;

    switch (type) {
      case 'message':
      case 'missed_call':
        if (relatedUserId) {
          router.push(`/chat/${relatedUserId}` as any);
        } else {
          router.push('/(tabs)/messages' as any);
        }
        break;
      case 'connection':
        // A new connection request — go straight to the Requests tab
        router.push('/(tabs)/connections' as any);
        break;
      case 'connection_accepted':
      case 'connection_declined':
      case 'match':
        if (relatedUserId) {
          router.push(`/(tabs)/(home)/profileview?userId=${relatedUserId}` as any);
        } else {
          router.push('/(tabs)/connections' as any);
        }
        break;
      case 'phone_request':
      case 'phone_response':
      case 'photo_request':
      case 'photo_request_declined':
        // Navigate to notifications to see the request/response
        router.push('/(tabs)/notifications' as any);
        break;
      case 'photo_request_approved':
        // Navigate to photo gallery of the user who approved the request
        if (relatedUserId) {
          router.push({
            pathname: '/photo-gallery' as any,
            params: { userId: relatedUserId, isOwnProfile: 'false' },
          } as any);
        } else {
          router.push('/(tabs)/notifications' as any);
        }
        break;
      default:
        router.push('/(tabs)/notifications' as any);
        break;
    }
  };

  if (!banner || Platform.OS === 'web') return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: insets.top + 10, transform: [{ translateY: slideY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.92}>
        {/* Icon */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: getIconColor(banner.type) + '22' },
          ]}
        >
          <IconSymbol
            name={getIconName(banner.type) as any}
            size={22}
            color={getIconColor(banner.type)}
          />
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <Text style={styles.title} numberOfLines={1}>
            {banner.title}
          </Text>
          {!!banner.body && (
            <Text style={styles.body} numberOfLines={2}>
              {banner.body}
            </Text>
          )}
        </View>

        {/* Dismiss */}
        <TouchableOpacity
          onPress={dismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
        >
          <IconSymbol name="xmark" size={13} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIconName(type: string): string {
  switch (type) {
    case 'message':
      return 'message.fill';
    case 'connection':
    case 'connection_accepted':
      return 'person.fill.checkmark';
    case 'connection_declined':
      return 'xmark.circle.fill';
    case 'match':
      return 'heart.fill';
    case 'phone_request':
    case 'phone_response':
      return 'phone.fill';
    case 'photo_request':
    case 'photo_request_approved':
    case 'photo_request_declined':
      return 'photo.fill';
    case 'missed_call':
      return 'phone.down.fill';
    default:
      return 'bell.fill';
  }
}

function getIconColor(type: string): string {
  switch (type) {
    case 'message':
      return colors.primary;
    case 'connection':
    case 'connection_accepted':
      return colors.success;
    case 'connection_declined':
      return colors.error;
    case 'match':
      return colors.secondary;
    case 'missed_call':
      return colors.error;
    case 'phone_request':
    case 'phone_response':
      return colors.primary;
    case 'photo_request':
    case 'photo_request_approved':
    case 'photo_request_declined':
      return colors.accent;
    default:
      return colors.accent;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999999,
    elevation: 35,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textArea: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 2,
    flexShrink: 0,
  },
});
