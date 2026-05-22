import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { borderRadius, colors, commonStyles, shadows, spacing } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import PhoneRequestManager from '@/components/PhoneRequestManager';
import PhotoRequestManager from '@/components/PhotoRequestManager';

type NotificationType =
  | 'match'
  | 'message'
  | 'connection'
  | 'system'
  | 'phone_request'
  | 'phone_response'
  | 'missed_call'
  | 'connection_accepted'
  | 'connection_declined'
  | 'photo_request'
  | 'photo_request_approved'
  | 'photo_request_declined';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  created_at: string;
  read: boolean;
  user_id: string;
  related_user_id?: string;
  notification_type?: string;
  body?: string;
  // data JSONB holds type/related_user_id before the schema migration is run
  data?: {
    type?: string;
    notification_type?: string;
    related_user_id?: string;
    description?: string;
    [key: string]: any;
  };
};

// ─── Group notifications by relative date ────────────────────────────────────
function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (d >= todayStart) groups['Today'].push(n);
    else if (d >= yesterdayStart) groups['Yesterday'].push(n);
    else if (d >= weekStart) groups['This Week'].push(n);
    else groups['Earlier'].push(n);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);

      if (!user) {
        Alert.alert('Error', 'Please log in to view notifications');
        router.replace('/login');
        return;
      }

      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Sync badge count whenever this screen comes into focus or loses focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      return () => {
        // Refresh the badge count in context when leaving the screen
        refreshNotifications();
      };
    }, [fetchNotifications, refreshNotifications])
  );

  // Real-time subscription — auto-refresh when the table changes
  useEffect(() => {
    if (!user) return;

    const channelName = `notifications-screen-${user.id}`;

    // Remove any existing channel with this name before subscribing
    const existingChannel = (supabase as any).getChannels?.()?.find(
      (ch: any) => ch.topic === `realtime:${channelName}`
    );
    if (existingChannel) {
      (supabase as any).removeChannel(existingChannel);
    }

    const channel = (supabase as any)
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      refreshNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      refreshNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await (supabase as any).from('notifications').delete().eq('id', notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      refreshNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handlePress = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);

    // Support both top-level columns (after migration) and data JSONB (before migration)
    const notifType = notification.type ?? notification.data?.type ?? 'system';
    const relatedUserId = notification.related_user_id ?? notification.data?.related_user_id;

    switch (notifType) {
      case 'message':
      case 'missed_call':
        if (relatedUserId) {
          router.push(`/chat/${relatedUserId}` as any);
        } else {
          router.push('/(tabs)/messages' as any);
        }
        break;
      case 'connection':
      case 'connection_accepted':
      case 'connection_declined':
        if (relatedUserId) {
          router.push(`/connected-profile/${relatedUserId}` as any);
        } else {
          router.push('/(tabs)/connections' as any);
        }
        break;
      case 'match':
        router.push('/(tabs)/connections' as any);
        break;
      case 'phone_request':
      case 'phone_response':
      case 'phone_shared':
        router.push('/(tabs)/connections' as any);
        break;
      case 'photo_request':
      case 'photo_request_declined':
        if (relatedUserId) {
          router.push(`/connected-profile/${relatedUserId}` as any);
        } else {
          router.push('/(tabs)/connections' as any);
        }
        break;
      case 'photo_request_approved':
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

  // ─── Timestamp ──────────────────────────────────────────────────────────────
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // ─── Icon / color helpers ────────────────────────────────────────────────────
  const getNotificationIcon = (type: NotificationType | string): string => {
    switch (type) {
      case 'match':
        return 'heart.fill';
      case 'message':
        return 'message.fill';
      case 'connection':
        return 'person.fill.checkmark';
      case 'connection_accepted':
        return 'checkmark.circle.fill';
      case 'connection_declined':
        return 'xmark.circle.fill';
      case 'phone_request':
        return 'phone.fill';
      case 'phone_response':
        return 'phone.badge.checkmark';
      case 'photo_request':
        return 'photo.fill';
      case 'photo_request_approved':
        return 'photo.badge.checkmark';
      case 'photo_request_declined':
        return 'photo.on.rectangle';
      case 'missed_call':
        return 'phone.down.fill';
      case 'system':
        return 'info.circle.fill';
      default:
        return 'bell.fill';
    }
  };

  const getNotificationColor = (type: NotificationType | string): string => {
    switch (type) {
      case 'match':
        return colors.secondary;
      case 'message':
        return colors.primary;
      case 'connection':
      case 'connection_accepted':
      case 'phone_response':
      case 'photo_request_approved':
        return colors.success;
      case 'connection_declined':
      case 'missed_call':
      case 'photo_request_declined':
        return colors.error;
      case 'phone_request':
      case 'photo_request':
        return colors.primary;
      case 'system':
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  const getTypeLabel = (type: NotificationType | string): string => {
    switch (type) {
      case 'match':
        return 'Match';
      case 'message':
        return 'Message';
      case 'connection':
        return 'Connection Request';
      case 'connection_accepted':
        return 'Connected';
      case 'connection_declined':
        return 'Declined';
      case 'phone_request':
        return 'Phone Request';
      case 'phone_response':
        return 'Phone Request';
      case 'photo_request':
        return 'Photo Request';
      case 'photo_request_approved':
        return 'Photo Approved';
      case 'photo_request_declined':
        return 'Photo Declined';
      case 'missed_call':
        return 'Missed Call';
      case 'system':
        return 'System';
      default:
        return 'Notification';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groups = groupByDate(notifications);

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading notifications…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: () =>
            unreadCount > 0 ? (
              <Pressable onPress={markAllAsRead} style={styles.markAllButton}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            ) : null,
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>
                {unreadCount > 99 ? '99+' : unreadCount} unread
              </Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Pending Requests */}
        <PhoneRequestManager />
        <PhotoRequestManager />

        {notifications.length > 0 ? (
          groups.map(({ label, items }) => (
            <View key={label} style={styles.group}>
              {/* Section label */}
              <Text style={styles.groupLabel}>{label}</Text>

              {items.map((notification) => {
                const notifType = notification.type ?? notification.data?.type ?? 'system';
                const iconColor = getNotificationColor(notifType);
                return (
                  <Pressable
                    key={notification.id}
                    style={({ pressed }) => [
                      styles.notificationCard,
                      !notification.read && styles.unreadCard,
                      pressed && styles.pressedCard,
                    ]}
                    onPress={() => handlePress(notification)}
                    android_ripple={{ color: colors.primary + '12', borderless: false }}
                  >
                    <View style={styles.notificationContent}>
                      {/* Icon circle */}
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: iconColor + '18' },
                        ]}
                      >
                        <IconSymbol
                          name={getNotificationIcon(notifType) as any}
                          size={22}
                          color={iconColor}
                        />
                      </View>

                      {/* Text */}
                      <View style={styles.textContainer}>
                        <View style={styles.titleRow}>
                          <Text
                            style={[
                              styles.notificationTitle,
                              !notification.read && styles.unreadTitle,
                            ]}
                            numberOfLines={1}
                          >
                            {notification.title}
                          </Text>
                          {/* Type chip */}
                          <View
                            style={[styles.typeChip, { backgroundColor: iconColor + '15' }]}
                          >
                            <Text style={[styles.typeChipText, { color: iconColor }]}>
                              {getTypeLabel(notifType)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.notificationDescription} numberOfLines={2}>
                          {notification.body || notification.description || notification.data?.description}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatTimestamp(notification.created_at)}
                        </Text>
                      </View>

                      {/* Delete button */}
                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => deleteNotification(notification.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <IconSymbol name="xmark" size={14} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    {/* Unread indicator bar */}
                    {!notification.read && (
                      <View style={[styles.unreadBar, { backgroundColor: iconColor }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <IconSymbol name="bell.slash" size={48} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>
              New notifications for messages, connections and requests will appear here.
            </Text>
          </View>
        )}

        {/* Bottom spacing for floating tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  unreadPill: {
    backgroundColor: colors.primary + '18',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unreadPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '12',
  },
  markAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Groups
  group: {
    marginTop: 20,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 2,
  },

  // Cards
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  unreadCard: {
    borderColor: colors.primary + '50',
    borderWidth: 1.5,
    backgroundColor: colors.primary + '04',
  },
  pressedCard: {
    opacity: 0.85,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  unreadTitle: {
    fontWeight: '800',
  },
  typeChip: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notificationDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 4,
    flexShrink: 0,
  },
  // Left accent bar for unread
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
