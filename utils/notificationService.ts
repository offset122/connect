// utils/notificationService.ts
// Handles push notifications for all notification types

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Device from 'expo-device';

const isWeb = Platform.OS === 'web';

// Configure notification handler — controls behavior when notification arrives
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data;
      const isCallNotification = data?.type === 'incoming_call';

      return {
        shouldShowAlert: true,
        shouldPlaySound: isCallNotification || data?.type === 'message',
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: isCallNotification
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH,
      };
    },
  });
}

class NotificationServiceClass {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private _isInitialized = false;

  get isInitialized() {
    return this._isInitialized;
  }

  /**
   * Initialize notification service and request permissions
   */
  async init() {
    if (isWeb) return false;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      console.log('[NotificationService] init() — existing permission status:', existingStatus);

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('[NotificationService] Permission after request:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        console.warn('[NotificationService] Permission not granted — notifications disabled');
        return false;
      }

      // Configure Android notification channels
      if (Platform.OS === 'android') {
        // Calls — highest priority, full-screen intent
        await Notifications.setNotificationChannelAsync('calls', {
          name: 'Calls',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // Messages — high priority, heads-up
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // Connections (new connections / match)
        await Notifications.setNotificationChannelAsync('connections', {
          name: 'Connections',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // Requests (phone / photo requests)
        await Notifications.setNotificationChannelAsync('requests', {
          name: 'Requests',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });

        // Default / system notifications
        await Notifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          showBadge: true,
        });
      }

      this.setupListeners();
      this._isInitialized = true;
      console.log('[NotificationService] init() complete — notifications ready');
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  /**
   * Setup internal notification event listeners
   */
  private setupListeners() {
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'incoming_call') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response.notification.request.content.data?.type);
    });
  }

  /**
   * Resolve the Android channel id for a given notification type
   */
  private getChannelId(type: string): string {
    if (type === 'message') return 'messages';
    if (['connection', 'connection_accepted', 'connection_declined', 'match'].includes(type))
      return 'connections';
    if (
      [
        'phone_request',
        'phone_response',
        'photo_request',
        'photo_request_approved',
        'photo_request_declined',
      ].includes(type)
    )
      return 'requests';
    if (type === 'incoming_call') return 'calls';
    return 'default';
  }

  /**
   * Show a local push notification for any app event (message, connection, request, etc.)
   * Safe to call even before init — will check permissions first.
   */
  async showAppNotification(params: {
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }): Promise<string | null> {
    if (isWeb) return null;

    try {
      const { status } = await Notifications.getPermissionsAsync();
      console.log('[NotificationService] Permission status:', status);
      if (status !== 'granted') {
        console.warn('[NotificationService] Notifications not granted — requesting...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.warn('[NotificationService] Permission denied, cannot show notification');
          return null;
        }
      }

      const { title, body, type, data } = params;
      const channelId = this.getChannelId(type);
      console.log(`[NotificationService] Scheduling notification: "${title}" type=${type} channel=${channelId}`);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { type, ...data },
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: null, // Show immediately
      });

      console.log('[NotificationService] Notification scheduled, id:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('[NotificationService] Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show local notification for incoming call (WhatsApp-style)
   */
  async showIncomingCallNotification(params: {
    callId: string;
    callerName: string;
    callerId: string;
    callType: 'voice' | 'video';
  }) {
    if (isWeb) return null;

    try {
      const { callId, callerName, callerId, callType } = params;

      await this.cancelCallNotifications();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Incoming ${callType} call`,
          body: `${callerName} is calling...`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: {
            type: 'incoming_call',
            callId,
            callerId,
            callerName,
            callType,
          },
          categoryIdentifier: 'call',
          ...(Platform.OS === 'android' && { channelId: 'calls' }),
        },
        trigger: null,
      });

      return notificationId;
    } catch (error) {
      console.error('Error showing incoming call notification:', error);
      return null;
    }
  }

  /**
   * Cancel all call-related notifications
   */
  async cancelCallNotifications() {
    if (isWeb) return;
    try {
      const notifications = await Notifications.getPresentedNotificationsAsync();
      for (const notification of notifications) {
        if (notification.request.content.data?.type === 'incoming_call') {
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      }
    } catch (error) {
      console.error('Error canceling call notifications:', error);
    }
  }

  /**
   * Cancel a specific notification by id
   */
  async cancelNotification(notificationId: string) {
    if (isWeb) return;
    try {
      await Notifications.dismissNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Register device for remote push notifications and save token to Supabase.
   * Call this after the user logs in and permissions are granted.
   */
  async registerPushToken(supabase: any, userId: string): Promise<string | null> {
    if (isWeb || !Device.isDevice) return null;

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return null;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '4bf6247a-fa80-4a8d-b521-b180a4bfd2bc', // EAS project ID from app.json
      });

      const token = tokenData.data;
      this.expoPushToken = token;

      // Persist to users table so the server/edge function can look it up
      await supabase
        .from('users')
        .update({ expo_push_token: token })
        .eq('auth_id', userId);

      console.log('Push token registered:', token);
      return token;
    } catch (error) {
      console.warn('Could not register push token:', error);
      return null;
    }
  }

  /**
   * Send a remote push notification via Expo Push API.
   * Use this when the recipient may have the app closed/killed.
   * Requires the recipient's expo_push_token stored in the DB.
   */
  async sendRemotePush(params: {
    expoPushToken: string;
    title: string;
    body: string;
    type: string;
    data?: Record<string, any>;
  }): Promise<void> {
    try {
      const { expoPushToken, title, body, type, data } = params;
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          title,
          body,
          sound: 'default',
          priority: type === 'message' ? 'high' : 'normal',
          channelId: this.getChannelId(type),
          data: { type, ...data },
        }),
      });
    } catch (error) {
      console.warn('Remote push failed (non-critical):', error);
    }
  }

  /**
   * Cleanup listeners and reset state
   */
  destroy() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    this.expoPushToken = null; // Clear cached token so it's not reused by the next login session
    this._isInitialized = false;
  }

  getExpoPushToken() {
    return this.expoPushToken;
  }
}

// Singleton export
export const notificationService = new NotificationServiceClass();
export default notificationService;
