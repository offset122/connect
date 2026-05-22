import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { notificationService } from '@/utils/notificationService';
import { inAppNotificationEmitter } from '@/utils/inAppNotificationEmitter';

const SUPABASE_URL = "https://dbvsexpcrojtnriqfbwa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidnNleHBjcm9qdG5yaXFmYndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MzQyMzYsImV4cCI6MjA3NzAxMDIzNn0.e3bGdg7pvM0r6eF82oTlhJYRuuQcYnvYva_232gj2y4";

interface NotificationContextType {
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Track app state so we know when to fire local push vs. in-app banner
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      appStateRef.current = state;
      // Re-fetch count whenever the app comes back to the foreground
      if (state === 'active') {
        fetchUnreadCount();
      }
    });
    return () => sub.remove();
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { count, error } = await (supabase as any)
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    // Silently refresh count — don't set loading: true to avoid triggering
    // full-page spinners in screens that watch the loading state
    await fetchUnreadCount();
  };

  useEffect(() => {
    fetchUnreadCount();

    if (!user) return;

    const channelName = `notifications-ctx-${user.id}`;

    const subscription = (supabase as any)
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('[NotificationContext] INSERT received for user:', user.id, 'type:', payload.new?.type ?? payload.new?.data?.type);
          // Update unread badge count
          fetchUnreadCount();

          if (Platform.OS !== 'web') {
            const notif = payload.new;
            // Support both top-level columns (after migration) and data JSONB (before migration)
            const notifType = notif.type ?? notif.data?.type ?? 'system';
            const relatedUserId = notif.related_user_id ?? notif.data?.related_user_id;
            const isAppActive = appStateRef.current === 'active';

            console.log('[NotificationContext] App state:', appStateRef.current, '— showing notification:', notif.title);

            if (isAppActive) {
              // App is in foreground — emit directly to the banner (no OS scheduling needed)
              inAppNotificationEmitter.emit({
                id: notif.id ?? String(Date.now()),
                title: notif.title || 'New Notification',
                body: notif.body || notif.description || notif.data?.description || '',
                type: notifType,
                data: {
                  notificationId: notif.id,
                  related_user_id: relatedUserId,
                },
              });
            } else {
              // App is backgrounded — schedule a real OS notification
              notificationService.showAppNotification({
                title: notif.title || 'New Notification',
                body: notif.body || notif.description || notif.data?.description || '',
                type: notifType,
                data: {
                  notificationId: notif.id,
                  related_user_id: relatedUserId,
                },
              }).then((notifId) => {
                console.log('[NotificationContext] OS notification scheduled:', notifId);
              });
            }

            // Always call edge function — handles fully-killed app case
            fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ notification: notif }),
            }).catch(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe((status: string) => {
        console.log('[NotificationContext] Realtime subscription status:', status, 'for user:', user.id);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, loading, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
