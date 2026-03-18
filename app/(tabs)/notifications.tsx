import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PhoneRequestManager from "@/components/PhoneRequestManager";

type Notification = {
  id: string;
  type: 'match' | 'message' | 'connection' | 'system' | 'phone_request' | 'phone_response' | 'missed_call' | 'connection_accepted' | 'connection_declined';
  title: string;
  description: string;
  created_at: string;
  read: boolean;
  user_id: string;
  related_user_id?: string;
  notification_type?: string;
  body?: string;
};

export default function NotificationsScreen() {
  const { user } = useAuth();
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

      const { data: notificationsData, error: notificationsError } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;

      setNotifications(notificationsData || []);
      console.log('Notifications loaded:', notificationsData?.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
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

      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await (supabase as any)
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      // Update local state
      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

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

  const getNotificationIcon = (type: string) => {
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
      case 'missed_call':
        return 'phone.down.fill';
      case 'system':
        return 'info.circle.fill';
      default:
        return 'bell.fill';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'match':
        return colors.secondary;
      case 'message':
        return colors.primary;
      case 'connection':
        return colors.success;
      case 'connection_accepted':
        return colors.success;
      case 'connection_declined':
        return colors.error;
      case 'phone_request':
        return colors.primary;
      case 'phone_response':
        return colors.success;
      case 'missed_call':
        return colors.error;
      case 'system':
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
        if (notification.related_user_id) {
          router.push(`/chat/${notification.related_user_id}`);
        }
        break;
      case 'connection':
      case 'connection_accepted':
      case 'connection_declined':
        if (notification.related_user_id) {
          router.push(`/connected-profile/${notification.related_user_id}`);
        } else {
          router.push('/(tabs)/connections');
        }
        break;
      case 'phone_request':
      case 'phone_response':
        // Navigate to connections to handle phone requests
        router.push('/(tabs)/connections');
        break;
      case 'missed_call':
        if (notification.related_user_id) {
          router.push(`/chat/${notification.related_user_id}`);
        }
        break;
      case 'match':
        // Navigate to connections or profile
        router.push('/(tabs)/connections');
        break;
      default:
        // Do nothing for system notifications
        break;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () => (
            unreadCount > 0 ? (
              <Pressable onPress={markAllAsRead} style={styles.markAllButton}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </Pressable>
            ) : null
          ),
        }}
      />
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Phone Number Requests */}
        <PhoneRequestManager />

        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <Pressable
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.read && styles.unreadCard
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: getNotificationColor(notification.type) + '20' }
                ]}>
                  <IconSymbol 
                    name={getNotificationIcon(notification.type)} 
                    size={24} 
                    color={getNotificationColor(notification.type)} 
                  />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={[
                    styles.notificationTitle,
                    !notification.read && styles.unreadTitle
                  ]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationDescription}>
                    {notification.body || notification.description}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimestamp(notification.created_at)}
                  </Text>
                </View>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => deleteNotification(notification.id)}
                >
                  <IconSymbol name="xmark" size={16} color={colors.textSecondary} />
                </Pressable>

                {!notification.read && <View style={styles.unreadDot} />}
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="bell.slash" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});