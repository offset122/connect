// components/NotificationInitializer.tsx
// Initializes notification service and handles navigation on notification tap.

import { useEffect } from 'react';
import { notificationService } from '@/utils/notificationService';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';

export function NotificationInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      notificationService.destroy();
      Notifications.setNotificationHandler(null);
      return;
    }

    // Initialize service (requests permissions + creates channels)
    notificationService.init().catch((error) => {
      console.error('Failed to initialize notification service:', error);
    });

    // Handle notification tap — navigate to the appropriate screen
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      const type: string = data?.type ?? '';
      const relatedUserId: string | undefined = data?.related_user_id;

      switch (type) {
        // ── Calls ────────────────────────────────────────────────────────────
        case 'incoming_call': {
          const callId = data.callId as string;
          const callerId = data.callerId as string;
          const callType = data.callType as string;

          if (callType === 'video') {
            router.push({
              pathname: '/call/video-call' as any,
              params: { remoteUserId: callerId, callDirection: 'incoming', callId },
            } as any);
          } else {
            router.push({
              pathname: '/call/voice-call' as any,
              params: { remoteUserId: callerId, callDirection: 'incoming', callId },
            } as any);
          }
          break;
        }

        // ── Messages ─────────────────────────────────────────────────────────
        case 'message':
        case 'missed_call': {
          if (relatedUserId) {
            router.push(`/chat/${relatedUserId}` as any);
          } else {
            router.push('/(tabs)/messages' as any);
          }
          break;
        }

        // ── Connections ───────────────────────────────────────────────────────
        case 'connection':
        case 'connection_accepted':
        case 'connection_declined':
        case 'match': {
          if (relatedUserId) {
            router.push(`/connected-profile/${relatedUserId}` as any);
          } else {
            router.push('/(tabs)/connections' as any);
          }
          break;
        }

// ── Requests (phone / photo) ──────────────────────────────────────────
        case 'phone_request':
        case 'phone_response':
        case 'photo_request': {
          router.push('/(tabs)/notifications' as any);
          break;
        }

        // ── Photo request approved ─ now navigate to gallery ─────────────────
        case 'photo_request_approved':
        case 'photo_request_declined': {
          if (relatedUserId) {
            // Navigate to photo gallery of the user who approved the request
            router.push({
              pathname: '/photo-gallery' as any,
              params: { userId: relatedUserId, isOwnProfile: 'false' },
            } as any);
          } else {
            router.push('/(tabs)/notifications' as any);
          }
          break;
        }

        // ── Everything else → notifications screen ────────────────────────────
        default: {
          router.push('/(tabs)/notifications' as any);
          break;
        }
      }
    });

    return () => {
      subscription.remove();
      notificationService.destroy();
    };
  }, [user]);

  return null;
}

export default NotificationInitializer;
