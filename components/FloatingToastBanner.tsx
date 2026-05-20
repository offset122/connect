import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { borderRadius, colors, shadows } from '@/styles/commonStyles';
import { useToast, ToastMessage } from '@/contexts/ToastContext';

const TOAST_HEIGHT = 80;

export default function FloatingToastBanner() {
  const { toasts, removeToast } = useToast();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  // Display the first (oldest) toast
  const currentToast = toasts[0];

  return (
    <View
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 10, Platform.OS === 'ios' ? insets.top + 10 : 30),
        },
      ]}
      pointerEvents="box-none"
    >
      <ToastItem
        toast={currentToast}
        onDismiss={() => removeToast(currentToast.id)}
      />
    </View>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
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

    // Auto-dismiss based on duration
    const timer = setTimeout(() => {
      slideOut();
    }, toast.duration ?? 3000);

    return () => clearTimeout(timer);
  }, []);

  const slideOut = () => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(onDismiss);
  };

  const bgColor = getBgColor(toast.type);
  const iconColor = getIconColor(toast.type);
  const iconName = getIconName(toast.type);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ translateY: slideY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.toast, { backgroundColor: bgColor }]}
        onPress={slideOut}
        activeOpacity={0.9}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '22' }]}>
          <IconSymbol
            name={iconName as any}
            size={20}
            color={iconColor}
          />
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={styles.message} numberOfLines={1}>
              {toast.message}
            </Text>
          )}
        </View>

        {/* Close button */}
        <TouchableOpacity
          onPress={slideOut}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <IconSymbol name="xmark" size={12} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

function getBgColor(type: string): string {
  switch (type) {
    case 'success':
      return '#E8F5E9';
    case 'error':
      return '#FFEBEE';
    case 'warning':
      return '#FFF3E0';
    case 'info':
    default:
      return '#E3F2FD';
  }
}

function getIconColor(type: string): string {
  switch (type) {
    case 'success':
      return '#4CAF50';
    case 'error':
      return '#F44336';
    case 'warning':
      return '#FF9800';
    case 'info':
    default:
      return '#2196F3';
  }
}

function getIconName(type: string): string {
  switch (type) {
    case 'success':
      return 'checkmark.circle.fill';
    case 'error':
      return 'exclamationmark.circle.fill';
    case 'warning':
      return 'exclamationmark.triangle.fill';
    case 'info':
    default:
      return 'info.circle.fill';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  wrapper: {
    width: '100%',
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    ...shadows.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textArea: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    marginLeft: 8,
  },
});
