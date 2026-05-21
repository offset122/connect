/**
 * Simple event emitter for triggering the in-app notification banner directly.
 * This bypasses expo-notifications scheduling for foreground notifications,
 * which avoids Android channel/permission issues when the app is active.
 */

type BannerPayload = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, any>;
};

type Listener = (payload: BannerPayload) => void;

class InAppNotificationEmitter {
  private listeners: Listener[] = [];

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(payload: BannerPayload) {
    this.listeners.forEach((l) => {
      try {
        l(payload);
      } catch (e) {
        // ignore listener errors
      }
    });
  }
}

export const inAppNotificationEmitter = new InAppNotificationEmitter();
